<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\TrackingEvent;
use App\Models\Pricing;
use App\Http\Controllers\PackageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CambodiaWarehouseController extends Controller
{
    public function receive(Request $request, $id)
    {
        $data = $request->validate([
            'warehouse_location' => 'required|string|max:255',
            'condition' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($id, $data) {
            $package = Package::findOrFail($id);
            if (!in_array($package->status, ['In Transit', 'Cambodia Port', 'Customs', 'Arrived Cambodia', 'Cambodia Warehouse'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Package is not ready for Cambodia warehouse receiving.',
                ], 422);
            }

            $sameWarehouseReceipt = $package->status === 'Cambodia Warehouse'
                && (string) ($package->warehouse_location ?? '') === (string) $data['warehouse_location'];

            $package->warehouse_location = $data['warehouse_location'];
            $package->received_at = $package->received_at ?: now();
            $package->status = 'Cambodia Warehouse';
            $package->save();

            // IMPORTANT: receiving one package must not move the whole container.
            // Container/Shipment movement is controlled by ContainerController::transition.
            if (!$sameWarehouseReceipt) {
                TrackingEvent::create([
                    'tracking_number' => $package->tracking_number,
                    'package_id' => $package->id,
                    'status' => 'Cambodia Warehouse',
                    'location' => $data['warehouse_location'],
                    'warehouse' => 'Cambodia Warehouse',
                    'staff_name' => auth()->user()?->name ?? 'Cambodia Warehouse',
                    'note' => $data['note'] ?? 'Package received and stored in Cambodia warehouse',
                    'event_at' => now(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Package received in Cambodia warehouse.',
                'data' => $package->fresh(),
            ]);
        });
    }

    public function measure(Request $request, $id)
    {
        $data = $request->validate([
            'boxes' => 'required|array|min:1',
            'boxes.*.length' => 'required|numeric|min:0',
            'boxes.*.width' => 'required|numeric|min:0',
            'boxes.*.height' => 'required|numeric|min:0',
            'boxes.*.quantity' => 'nullable|integer|min:1',
            'boxes.*.unit' => 'nullable|in:cm,m,mm',
            'total_weight' => 'required|numeric|min:0',
            'warehouse_location' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($id, $data) {
            $package = Package::findOrFail($id);
            if (!in_array($package->status, ['Cambodia Warehouse', 'Measurement Completed'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receive the package into Cambodia Warehouse before measuring it.',
                ], 422);
            }
            $totalCbm = 0.0;
            $normalized = [];
            $oldBoxes = $package->boxes;
            $oldCbm = (float) ($package->total_cbm ?? 0);
            $oldWeight = (float) ($package->total_weight ?? 0);
            $oldLocation = (string) ($package->warehouse_location ?? '');

            foreach ($data['boxes'] as $box) {
                $qty = max(1, (int)($box['quantity'] ?? 1));
                $unit = strtolower($box['unit'] ?? 'cm');
                $factor = $unit === 'm' ? 1 : ($unit === 'mm' ? 0.001 : 0.01);
                $cbm = ((float)$box['length'] * (float)$box['width'] * (float)$box['height'])
                    * $factor * $factor * $factor * $qty;
                $totalCbm += $cbm;
                $normalized[] = [
                    'length' => (float)$box['length'],
                    'width' => (float)$box['width'],
                    'height' => (float)$box['height'],
                    'quantity' => $qty,
                    'unit' => $unit,
                    'cbm' => round($cbm, 6),
                ];
            }

            $package->boxes = $normalized;
            $package->box_count = array_sum(array_map(fn ($box) => (int) ($box['quantity'] ?? 1), $normalized));
            $package->total_cbm = round($totalCbm, 6);
            $package->total_weight = (float)$data['total_weight'];

            $measurementChanged = $oldBoxes != $normalized
                || abs($oldCbm - $package->total_cbm) > 0.000001
                || abs($oldWeight - $package->total_weight) > 0.0005
                || ($data['warehouse_location'] ?? $oldLocation) !== $oldLocation;

            // Final warehouse measurement is the billing trigger. Do not require a
            // fixed Pricing List here; the current logistics rate is entered in the bill.
            if (!empty($data['warehouse_location'])) {
                $package->warehouse_location = $data['warehouse_location'];
            }
            $package->status = 'Measurement Completed';
            $package->save();

            if ($measurementChanged) {
                $eventStatus = $package->status === 'Measurement Completed' && $oldCbm > 0
                    ? 'Measurement Updated'
                    : 'Measurement Completed';

                TrackingEvent::create([
                    'tracking_number' => $package->tracking_number,
                    'package_id' => $package->id,
                    'status' => $eventStatus,
                    'location' => $package->warehouse_location ?: 'Cambodia Warehouse',
                    'warehouse' => 'Cambodia Warehouse',
                    'staff_name' => auth()->user()?->name ?? 'Cambodia Warehouse',
                    'note' => $data['note'] ?? ($eventStatus === 'Measurement Updated'
                        ? 'Dimensions, CBM and weight updated'
                        : 'Dimensions, CBM and weight confirmed'),
                    'event_at' => now(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Package measurement completed.',
                'data' => $package->fresh(),
            ]);
        });
    }

    public function readyForBilling(Request $request, $id)
    {
        $data = $request->validate([
            'warehouse_location' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($id, $data) {
            $package = Package::findOrFail($id);

            if ($package->status !== 'Measurement Completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Complete Cambodia Warehouse measurement before preparing billing.',
                ], 422);
            }

            if ((float)$package->total_cbm <= 0 && (float)$package->total_weight <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Measured CBM or weight must be greater than zero before preparing billing.',
                ], 422);
            }

            // Rates are variable in Logistics. This action only confirms that the
            // package is measured and ready for billing; the actual current rate is
            // entered on the Open Bill. Do not require a fixed Pricing List here.
            if (!empty($data['warehouse_location'])) {
                $package->warehouse_location = $data['warehouse_location'];
            }
            $package->status = 'Ready for Billing';
            $package->save();

            TrackingEvent::create([
                'tracking_number' => $package->tracking_number,
                'package_id' => $package->id,
                'status' => 'Ready for Billing',
                'location' => $package->warehouse_location ?: 'Cambodia Warehouse',
                'warehouse' => 'Cambodia Warehouse',
                'staff_name' => auth()->user()?->name ?? 'Cambodia Warehouse',
                'note' => $data['note'] ?? 'Package ready for invoice generation',
                'event_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Package is ready for billing.',
                'data' => $package->fresh(),
            ]);
        });
    }
}
