<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LegacyPackageController extends ApiController
{
    private function customer($id): Customer
    {
        return Customer::query()
            ->where(function ($query) {
                $query->whereNull('customer_id')
                    ->orWhere(
                        'customer_id',
                        'not like',
                        'HFLTEST%'
                    );
            })
            ->findOrFail($id);
    }

    public function index(Request $request, $id)
    {
        $request->validate([
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        $customer = $this->customer($id);

        $perPage = (int) $request->input('per_page', 25);

        $packages = DB::table('legacy_packages')
            ->where('customer_id', $customer->customer_id)
            ->select([
                'id',
                'legacy_package_id',
                'source_code',
                'tracking_raw',
                'shipping_date',
                'shipping_datetime',
                'shipping_mode',
                'source_status',
                'weight_kg',
                'volume_cbm',
                'item_count',
            ])
            ->orderByDesc('shipping_datetime')
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->ok(
            $packages,
            'Historical packages retrieved'
        );
    }

    public function show($id, $archiveId)
    {
        $customer = $this->customer($id);

        $package = DB::table('legacy_packages')
            ->where('customer_id', $customer->customer_id)
            ->where('id', $archiveId)
            ->select([
                'id',
                'legacy_package_id',
                'customer_id',
                'customer_name',
                'source_code',
                'tracking_raw',
                'shipping_date',
                'shipping_datetime',
                'shipping_mode',
                'source_status',
                'weight_kg',
                'volume_cbm',
                'item_count',
                'items',
            ])
            ->first();

        if (!$package) {
            abort(404, 'Historical package not found');
        }

        $package->items = json_decode(
            $package->items ?? '[]',
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        // Original ERPNext Container ID from the archived CSV.
        // Column index 10 = Container ID in HFL Package.csv.
        // This is a historical reference, not an operational link.
        $sourceJson = DB::table('legacy_packages')
            ->where('id', $package->id)
            ->value('source_payload');

        $source = json_decode(
            (string) $sourceJson,
            true
        );

        $rawContainer = is_array($source)
            ? ($source['parent_csv_row'][10] ?? '')
            : '';

        $rawContainer = trim((string) $rawContainer);

        if (
            strlen($rawContainer) >= 2 &&
            str_starts_with($rawContainer, '"') &&
            str_ends_with($rawContainer, '"')
        ) {
            $rawContainer = trim(
                substr($rawContainer, 1, -1)
            );
        }

        $package->legacy_container_id =
            $rawContainer !== '' ? $rawContainer : null;

        // Historical tracking only; no operational events changed.
        $package->history = DB::table('legacy_package_history')
            ->where('legacy_package_row_id', $package->id)
            ->select([
                'id',
                'source_history_id',
                'event_at',
                'status',
                'is_return',
                'return_at',
            ])
            ->orderBy('event_at')
            ->orderBy('id')
            ->get();

        return $this->ok(
            $package,
            'Historical package detail'
        );
    }
}
