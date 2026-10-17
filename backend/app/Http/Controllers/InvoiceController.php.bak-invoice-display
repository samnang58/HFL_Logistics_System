<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\TrackingEvent;
use App\Models\Shipment;
use App\Models\Pricing;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends CrudController
{
    protected string $model = Invoice::class;

    protected array $rules = [
        'quotation_id' => 'nullable|integer',
        'customer_id' => 'required|string',
        'customer_name' => 'nullable|string',
        'status' => 'nullable|string',
        'items' => 'required|array|min:1',
        'discount' => 'nullable|numeric|min:0',
        'tax' => 'nullable|numeric|min:0',
        'due_date' => 'nullable|date',
        'meta' => 'nullable|array',
    ];

    protected function searchColumns(): array
    {
        return [
            'invoice_no',
            'customer_id',
            'customer_name',
            'status',
        ];
    }

    public function index(Request $r)
    {
        $q = Invoice::query()->where('is_test', false);

        if ($r->filled('search')) {
            $s = $r->string('search');
            $q->where(function ($x) use ($s) {
                foreach ($this->searchColumns() as $c) {
                    $x->orWhere($c, 'like', '%' . $s . '%');
                }
            });
        }

        return $this->ok($q->latest()->paginate((int) $r->input('per_page', 25)));
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::where('is_test', false)->findOrFail($id);
        $rules = $this->rules;

        foreach ($rules as $key => $rule) {
            $rules[$key] = str_replace('required|', '', $rule);
        }

        $invoice->update($request->validate($rules));

        return $this->ok($invoice, 'Updated');
    }

    public function destroy($id)
    {
        $invoice = Invoice::where('is_test', false)->findOrFail($id);
        $invoice->delete();

        return $this->ok(null, 'Deleted');
    }

    public function show($id)
    {
        $invoice = Invoice::where('is_test', false)->findOrFail($id);

        $payments = Payment::where('is_test', false)
            ->where('invoice_id', $invoice->id)
            ->orderByDesc('paid_at')
            ->get();

        $invoice->setAttribute('payments', $payments);

        return $this->ok($invoice, 'Invoice retrieved');
    }

    /**
     * Update the editable billing snapshot of an existing invoice.
     *
     * This is intentionally separate from the generic CRUD update so
     * accounting totals are always recalculated server-side and paid
     * amounts are never accepted from the browser.
     */
    public function updateBilling(Request $request, $id)
    {
        $data = $request->validate([
            'final_cbm' => 'required|numeric|min:0',
            'final_weight' => 'nullable|numeric|min:0',
            'pricing_type' => 'nullable|in:GC,SC',
            'rate' => 'required|numeric|min:0.0001',
            'delivery_fee' => 'nullable|numeric|min:0',
            'handling_fee' => 'nullable|numeric|min:0',
            'warehouse_fee' => 'nullable|numeric|min:0',
            'other_fee' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($data, $id) {
            $invoice = Invoice::where('is_test', false)->lockForUpdate()->findOrFail($id);

            if (in_array((string) $invoice->status, ['Cancelled', 'Void'], true)) {
                return $this->fail('Cancelled or void invoices cannot be edited.', [], 422);
            }

            $items = is_array($invoice->items) ? $invoice->items : [];
            $shippingIndex = collect($items)->search(
                fn ($item) => strtolower((string) ($item['type'] ?? '')) === 'shipping'
            );

            if ($shippingIndex === false) {
                return $this->fail(
                    'This invoice is not linked to a shipping package and cannot use package billing edit mode.',
                    [],
                    422
                );
            }

            $shippingItem = $items[$shippingIndex];
            $packageId = $shippingItem['package_id'] ?? null;
            $package = $packageId ? Package::find($packageId) : null;

            $snapshot = is_array($invoice->pricing_snapshot)
                ? $invoice->pricing_snapshot
                : [];
            $meta = is_array($invoice->meta)
                ? $invoice->meta
                : [];

            $finalCbm = (float) $data['final_cbm'];
            $finalWeight = array_key_exists('final_weight', $data) && $data['final_weight'] !== null
                ? (float) $data['final_weight']
                : (float) ($snapshot['final_weight'] ?? $meta['final_weight'] ?? 0);
            $pricingType = strtoupper((string) ($data['pricing_type'] ?? $snapshot['pricing_type'] ?? $meta['pricing_type'] ?? 'GC'));
            $rate = (float) $data['rate'];
            $rateType = strtoupper((string) ($snapshot['rate_type'] ?? 'CBM'));
            $minimumCbm = (float) ($snapshot['minimum_cbm'] ?? 0);

            $chargeable = $rateType === 'KG'
                ? $finalWeight
                : max($finalCbm, $minimumCbm);

            $shippingCost = round($chargeable * $rate, 2);

            $deliveryFee = (float) ($data['delivery_fee'] ?? 0);
            $handlingFee = (float) ($data['handling_fee'] ?? 0);
            $warehouseFee = (float) ($data['warehouse_fee'] ?? 0);
            $otherFee = (float) ($data['other_fee'] ?? 0);
            $discount = (float) ($data['discount'] ?? 0);

            $feeSubtotal = $deliveryFee + $handlingFee + $warehouseFee;
            $discount = min($feeSubtotal + $shippingCost + $otherFee, $discount);
            $grandTotal = round(max(0, $feeSubtotal + $shippingCost + $otherFee - $discount), 2);
            $paidAmount = round((float) ($invoice->paid_amount ?? 0), 2);

            // Do not silently create an accounting overpayment when an already-paid
            // invoice is edited downward. The user must resolve the payment first.
            if ($grandTotal + 0.0001 < $paidAmount) {
                return $this->fail(
                    'The new bill total cannot be lower than the amount already paid. Reduce/refund the payment first.',
                    [
                        'grand_total' => [
                            'New total must be at least ' . number_format($paidAmount, 2, '.', ''),
                        ],
                    ],
                    422
                );
            }

            $outstanding = round(max(0, $grandTotal - $paidAmount), 2);
            $status = $outstanding <= 0.0001 ? 'Paid' : ($paidAmount > 0 ? 'Partially Paid' : 'Unpaid');

            // Update the shipping line while preserving its tracking/package identity.
            $shippingItem['cbm'] = $finalCbm;
            $shippingItem['weight'] = $finalWeight;
            // Quantity represents the package box/item count, not CBM or weight.
            
            $boxCount = (int) ($package?->box_count ?? 0);
            $itemQuantity = (int) ($package?->quantity ?? 0);

            $shippingItem['quantity'] = max(
                1,
                $boxCount > 0
                    ? $boxCount
                    : (
                        $itemQuantity > 0
                            ? $itemQuantity
                            : (int) ($shippingItem['quantity'] ?? 1)
                    )
            );

            if ($package) {
                $shippingItem['description'] = trim(
                    (string) (
                        $package->product_name
                        ?: $package->product_category
                        ?: ($shippingItem['description'] ?? 'Logistics Service')
                    )
                );
            }
            $shippingItem['unit_price'] = $rate;
            $shippingItem['amount'] = $shippingCost;
            $items[$shippingIndex] = $shippingItem;

            // Remove old generated fee lines and rebuild them from the edited values.
            $items = array_values(array_filter($items, function ($item, $index) use ($shippingIndex) {
                if ($index === 0 && false) return true;
                $type = strtolower((string) ($item['type'] ?? ''));
                if ($type !== 'fee') return true;
                return false;
            }, ARRAY_FILTER_USE_BOTH));

            $packageForItems = $package;
            if ($packageForItems) {
                foreach ([
                    ['Delivery Fee', $deliveryFee],
                    ['Handling Fee', $handlingFee],
                    ['Warehouse Fee', $warehouseFee],
                    ['Other Fee', $otherFee],
                ] as [$label, $amount]) {
                    if ($amount > 0) {
                        $items[] = $this->feeItem($packageForItems, $label, $amount, $finalCbm, $finalWeight);
                    }
                }
            }

            // Re-assert shipping line first for a predictable print layout.
            $shippingLine = $shippingItem;
            $nonShipping = array_values(array_filter($items, fn ($item) => strtolower((string) ($item['type'] ?? '')) !== 'shipping'));
            $items = array_merge([$shippingLine], $nonShipping);

            $snapshot['pricing_type'] = $pricingType;
            $snapshot['rate'] = $rate;
            $snapshot['rate_type'] = $rateType;
            $snapshot['chargeable'] = $chargeable;
            $snapshot['final_cbm'] = $finalCbm;
            $snapshot['final_weight'] = $finalWeight;
            $snapshot['shipping_cost'] = $shippingCost;
            $snapshot['delivery_fee'] = $deliveryFee;
            $snapshot['handling_fee'] = $handlingFee;
            $snapshot['warehouse_fee'] = $warehouseFee;
            $snapshot['other_fee'] = $otherFee;
            $snapshot['discount'] = $discount;

            $meta['final_cbm'] = $finalCbm;
            $meta['final_weight'] = $finalWeight;
            $meta['pricing_type'] = $pricingType;
            $meta['rate'] = $rate;
            $meta['rate_type'] = $rateType;
            $meta['shipping_cost'] = $shippingCost;
            $meta['delivery_fee'] = $deliveryFee;
            $meta['handling_fee'] = $handlingFee;
            $meta['warehouse_fee'] = $warehouseFee;
            $meta['other_fee'] = $otherFee;
            $meta['discount'] = $discount;

            $invoice->items = $items;
            $invoice->pricing_snapshot = $snapshot;
            $invoice->meta = $meta;
            $invoice->subtotal = round($feeSubtotal, 2);
            $invoice->discount = round($discount, 2);
            $invoice->tax = 0;
            $invoice->grand_total = $grandTotal;
            $invoice->paid_amount = $paidAmount;
            $invoice->outstanding = $outstanding;
            $invoice->status = $status;
            if (!empty($data['due_date'])) {
                $invoice->due_date = $data['due_date'];
            }
            $invoice->save();

            if ($package) {
                $package->total_cbm = $finalCbm;
                $package->total_weight = $finalWeight;
                $package->pricing_type = $pricingType;
                $package->pricing_rate_type = $rateType;
                $package->shipping_rate = $rate;
                $package->shipping_cost = $shippingCost;
                $package->delivery_fee = $deliveryFee;
                $package->handling_fee = $handlingFee;
                $package->warehouse_fee = $warehouseFee;
                $package->other_fee = $otherFee;
                $package->discount = $discount;
                $package->grand_total = $grandTotal;
                if (in_array((string) $package->status, ['Measurement Completed', 'Ready for Billing', 'Cambodia Warehouse'], true)) {
                    $package->status = 'Invoiced';
                    TrackingEvent::create([
                        'tracking_number' => $package->tracking_number,
                        'package_id' => $package->id,
                        'status' => 'Invoiced',
                        'location' => $package->warehouse_location ?: 'Cambodia Warehouse',
                        'warehouse' => 'Cambodia Warehouse',
                        'staff_name' => auth()->user()?->name ?? 'Billing',
                        'note' => 'Current logistics rate confirmed; billing draft finalized',
                        'event_at' => now(),
                    ]);
                }
                $package->save();
            }

            return $this->ok(
                $invoice->fresh()->setAttribute(
                    'payments',
                    Payment::where('is_test', false)
                        ->where('invoice_id', $invoice->id)
                        ->orderByDesc('paid_at')
                        ->get()
                ),
                'Billing updated'
            );
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);

        $invoice = DB::transaction(function () use ($data) {

            $items = collect($data['items']);

            $shippingFee = round(
                $items
                    ->filter(fn ($item) => ($item['type'] ?? '') === 'shipping')
                    ->sum(fn ($item) => (float) ($item['amount'] ?? 0)),
                2
            );

            $otherFee = round(
                $items
                    ->filter(function ($item) {
                        $type = strtolower((string) ($item['type'] ?? ''));
                        $description = strtolower((string) ($item['description'] ?? ''));

                        return $type === 'other_fee'
                            || $description === 'other fee';
                    })
                    ->sum(fn ($item) => (float) ($item['amount'] ?? 0)),
                2
            );

            $subtotal = round(
                $items
                    ->reject(function ($item) {
                        return ($item['type'] ?? '') === 'shipping'
                            || strtolower((string) ($item['description'] ?? '')) === 'other fee';
                    })
                    ->sum(fn ($item) => (float) ($item['amount'] ?? 0)),
                2
            );

            $discount = min(
                $subtotal + $shippingFee + $otherFee,
                (float) ($data['discount'] ?? 0)
            );

            $grandTotal = round(
                max(
                    0,
                    $subtotal + $shippingFee + $otherFee - $discount
                ),
                2
            );

            $meta = $data['meta'] ?? [];

            $meta['bill_date'] = $meta['bill_date']
                ?? now()->toDateString();

            $meta['shipping_fee'] = $shippingFee;
            $meta['other_fee'] = $otherFee;

            $invoice = new Invoice();

            $invoice->invoice_no = 'TMP-INV-' . Str::uuid();
            $invoice->quotation_id = $data['quotation_id'] ?? null;
            $invoice->customer_id = $data['customer_id'];
            $invoice->customer_name = $data['customer_name'] ?? null;
            $invoice->items = $data['items'];
            $invoice->discount = $discount;
            $invoice->tax = 0;
            $invoice->subtotal = $subtotal;
            $invoice->grand_total = $grandTotal;
            $invoice->paid_amount = 0;
            $invoice->outstanding = $grandTotal;
            $invoice->status = 'Unpaid';
            $invoice->due_date = $data['due_date']
                ?? now()->addDays(7)->toDateString();
            $invoice->meta = $meta;

            $invoice->save();

            $invoice->invoice_no =
                $this->finalizeInvoiceNumber($invoice->id);

            $invoice->save();

            return $invoice->fresh();
        });

        return $this->ok($invoice, 'Created');
    }

    /**
     * Generate Invoice directly from Package.
     *
     * Billing workflow:
     *
     * Cambodia Warehouse
     *      ↓
     * Measurement Completed
     *      ↓
     * Ready for Billing
     *      ↓
     * Billing
     *      ↓
     * Final CBM / Weight
     *      ↓
     * GC / SC
     *      ↓
     * Rate Override
     *      ↓
     * Shipping Cost
     *      ↓
     * Fees / Discount
     *      ↓
     * Grand Total
     *      ↓
     * Invoice
     */
    public function fromPackage(Request $request, $packageId)
    {
        $billing = $request->validate([
            'final_cbm' => 'nullable|numeric|min:0',
            'final_weight' => 'nullable|numeric|min:0',
            'pricing_type' => 'nullable|in:GC,SC',
            'rate' => 'nullable|numeric|min:0',
            'delivery_fee' => 'nullable|numeric|min:0',
            'handling_fee' => 'nullable|numeric|min:0',
            'warehouse_fee' => 'nullable|numeric|min:0',
            'other_fee' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use (
            $request,
            $packageId,
            $billing
        ) {

            /*
             * ---------------------------------------------------------
             * 1. FIND PACKAGE
             * ---------------------------------------------------------
             */

            $package = Package::with([
                'customer',
                'containers.shipment',
            ])
                ->where(function ($query) use ($packageId) {

                    $query->where('id', $packageId)
                        ->orWhere('package_id', $packageId)
                        ->orWhere('hfl_package_code', $packageId)
                        ->orWhere('tracking_number', $packageId)
                        ->orWhere(
                            'china_waybill_number',
                            $packageId
                        );
                })
                ->firstOrFail();

            /*
             * ---------------------------------------------------------
             * 2. PREVENT DUPLICATE INVOICE
             * ---------------------------------------------------------
             */

            $existingInvoice = Invoice::query()
                ->where('is_test', false)
                ->get()
                ->first(function ($invoice) use ($package) {

                    $items = is_array($invoice->items)
                        ? $invoice->items
                        : [];

                    return collect($items)->contains(
                        fn ($item) =>
                            (string) ($item['package_id'] ?? '')
                            === (string) $package->id
                    );
                });

            if ($existingInvoice) {

                if (!in_array(
                    (string) $package->status,
                    [
                        'Delivered',
                        'Cancelled',
                        'Returned',
                        'Invoiced',
                        'Partially Paid',
                        'Ready for Delivery',
                    ],
                    true
                )) {

                    $package->status = 'Invoiced';
                    $package->save();

                    TrackingEvent::create([
                        'tracking_number' =>
                            $package->tracking_number,

                        'package_id' =>
                            $package->id,

                        'status' => 'Invoiced',

                        'location' =>
                            $package->warehouse_location
                            ?: 'Cambodia Warehouse',

                        'warehouse' =>
                            'Cambodia Warehouse',

                        'staff_name' =>
                            auth()->user()?->name
                            ?? 'Billing',

                        'note' =>
                            'Existing invoice linked to package',

                        'event_at' => now(),
                    ]);
                }

                $existingInvoice->setAttribute(
                    'payments',
                    Payment::where('is_test', false)
                    ->where(
                        'invoice_id',
                        $existingInvoice->id
                    )
                        ->orderByDesc('paid_at')
                        ->get()
                );

                return $this->ok(
                    $existingInvoice,
                    'Package already has an invoice.'
                );
            }

            /*
             * ---------------------------------------------------------
             * 3. AUTO-PREPARE BILLING
             * ---------------------------------------------------------
             *
             * Billing is intentionally one-click for warehouse staff. If the
             * package is still in Cambodia Warehouse / Measurement Completed,
             * automatically validate the final measurement, resolve the active
             * DB pricing, recalculate the package pricing snapshot, and move it
             * to Ready for Billing. Staff do not need to leave Billing and
             * manually click "Mark Ready for Billing" first.
             */

            // Container Movement is the operational source of truth for transport
            // and physical arrival. A package can still carry an older transport
            // status such as "Loading" because ContainerController intentionally
            // does not overwrite the package lifecycle after warehouse stages.
            // For billing, use the latest active container movement as the effective
            // arrival state so a Container marked Received/Cambodia Warehouse can
            // be billed without requiring staff to manually edit the package status.
            $containerForBilling = $package->containers
                ->sortByDesc(fn ($container) => optional($container->trackingEvents->first())->event_date ?? $container->updated_at)
                ->first();

            $effectiveBillingStatus = (string) ($package->status ?? '');
            if ($containerForBilling) {
                $containerStatus = (string) ($containerForBilling->status ?? '');
                if (in_array($containerStatus, ['Cambodia Warehouse', 'Received'], true)) {
                    $effectiveBillingStatus = 'Cambodia Warehouse';
                } elseif ($containerStatus === 'Delivered' && $effectiveBillingStatus === 'Loading') {
                    // Keep last-mile delivery controlled by Delivery/POD, but do not
                    // block an invoice solely because the package lifecycle is stale.
                    $effectiveBillingStatus = 'Cambodia Warehouse';
                }
            }

            if (in_array($effectiveBillingStatus, ['Cambodia Warehouse', 'Measurement Completed'], true)) {

                if ((float) $package->total_cbm <= 0 && (float) $package->total_weight <= 0) {
                    return $this->fail(
                        'Please complete the Cambodia Warehouse measurement first. CBM or weight is required before billing.',
                        [
                            'status' => [
                                'Current package status: ' . ($package->status ?: 'Unknown'),
                            ],
                        ],
                        422
                    );
                }

                // Pricing is optional at this stage. Logistics rates change frequently,
                // so a package can open a Billing Draft even when no active Pricing List
                // exists. The final/current rate is entered by billing staff on the bill.
                $pricingResolver = app(PackageController::class);
                $activePricing = $pricingResolver->findActivePricingForPackage(
                    strtoupper((string) $package->shipping_mode),
                    strtoupper((string) $package->pricing_type),
                    trim((string) $package->from_warehouse),
                    trim((string) $package->to_warehouse)
                );

                if ($activePricing) {
                    $package = $pricingResolver->recalculatePricing($package);
                }

                // Do not force Ready for Billing here. Without a current rate this is
                // a Billing Draft; once the rate is entered and saved, the invoice
                // becomes Unpaid and the package moves to Invoiced.
            }

            if (!in_array($effectiveBillingStatus, ['Cambodia Warehouse', 'Measurement Completed', 'Ready for Billing'], true)) {
                return $this->fail(
                    'Package cannot be billed from its current status: ' . ($package->status ?: 'Unknown') . '.',
                    [
                        'status' => [
                            'Only a package that is Ready for Billing can create an invoice.',
                        ],
                    ],
                    422
                );
            }

            /*
             * ---------------------------------------------------------
             * 4. CUSTOMER / CONTAINER / SHIPMENT
             * ---------------------------------------------------------
             */

            $customer =
                $package->customer
                ?: Customer::where(
                    'customer_id',
                    $package->customer_id
                )->first();

            $container = $package->containers->first();

            $shipment = $container?->shipment;

            /*
             * Fallback: find shipment by package_ids
             */
            if (!$shipment) {

                $shipment = Shipment::query()
                    ->get()
                    ->first(function ($candidate) use ($package) {

                        $ids = is_array($candidate->package_ids)
                            ? $candidate->package_ids
                            : (
                                json_decode(
                                    (string) $candidate->package_ids,
                                    true
                                ) ?: []
                            );

                        return collect($ids)
                            ->map(fn ($value) => (string) $value)
                            ->contains(
                                (string) $package->id
                            );
                    });
            }

            /*
             * ---------------------------------------------------------
             * 5. FINAL BILLING VALUES
             * ---------------------------------------------------------
             */

            $finalCbm =
                array_key_exists('final_cbm', $billing)
                && $billing['final_cbm'] !== null
                    ? (float) $billing['final_cbm']
                    : (float) ($package->total_cbm ?? 0);

            $finalWeight =
                array_key_exists('final_weight', $billing)
                && $billing['final_weight'] !== null
                    ? (float) $billing['final_weight']
                    : (float) ($package->total_weight ?? 0);

            /*
             * Pricing Type:
             * GC or SC
             */
            $pricingType = strtoupper(
                (string) (
                    $billing['pricing_type']
                    ?? $package->pricing_type
                    ?? 'GC'
                )
            );

            /*
             * Shipping information
             */
            $shippingMode = strtoupper(
                (string) (
                    $shipment?->shipping_mode
                    ?: $package->shipping_mode
                    ?: 'LAND'
                )
            );

            $origin = (string) (
                $shipment?->origin
                ?: $package->from_warehouse
                ?: ''
            );

            $destination = (string) (
                $shipment?->destination
                ?: $package->to_warehouse
                ?: ''
            );

            /*
             * ---------------------------------------------------------
             * 6. FIND ACTIVE PRICING FROM DATABASE
             * ---------------------------------------------------------
             */

            $pricing = null;

            if ($origin !== '' && $destination !== '') {

                $today = now()->toDateString();

                $pricing = Pricing::query()
                    ->where(
                        'shipping_mode',
                        $shippingMode
                    )
                    ->where(
                        'pricing_type',
                        $pricingType
                    )
                    ->where(
                        'origin',
                        $origin
                    )
                    ->where(
                        'destination',
                        $destination
                    )
                    ->where(
                        'status',
                        'Active'
                    )
                    ->where(function ($query) use ($today) {

                        $query
                            ->whereNull('effective_date')
                            ->orWhereDate(
                                'effective_date',
                                '<=',
                                $today
                            );
                    })
                    ->where(function ($query) use ($today) {

                        $query
                            ->whereNull('expiry_date')
                            ->orWhereDate(
                                'expiry_date',
                                '>=',
                                $today
                            );
                    })
                    ->orderByDesc('effective_date')
                    ->first();
            }

            /*
             * ---------------------------------------------------------
             * 7. INITIALIZE PRICING VALUES
             * ---------------------------------------------------------
             */

            $pricingSnapshot = null;

            $rateType = 'CBM';
            $minimumCbm = 0;
            $rate = null;
            $pricingId = $package->pricing_id;

            /*
             * Pricing List default
             */
            if ($pricing) {

                $pricingId =
                    $pricing->pricing_id;

                $rateType = strtoupper(
                    (string) (
                        $pricing->rate_type
                        ?: 'CBM'
                    )
                );

                $minimumCbm =
                    (float) (
                        $pricing->minimum_cbm
                        ?? 0
                    );

                $rate =
                    (float) $pricing->rate;

                $pricingSnapshot = [
                    'pricing_id' =>
                        $pricing->pricing_id,

                    'rate_name' =>
                        $pricing->rate_name,

                    'shipping_mode' =>
                        $pricing->shipping_mode,

                    'pricing_type' =>
                        $pricingType,

                    'origin' =>
                        $pricing->origin,

                    'destination' =>
                        $pricing->destination,

                    'rate_type' =>
                        $rateType,

                    'rate' =>
                        $rate,

                    'minimum_cbm' =>
                        $minimumCbm,

                    'currency' =>
                        $pricing->currency,

                    'effective_date' =>
                        $pricing->effective_date,

                    'expiry_date' =>
                        $pricing->expiry_date,
                ];
            }

            /*
             * ---------------------------------------------------------
             * 8. BILLING RATE OVERRIDE
             * ---------------------------------------------------------
             *
             * If Billing screen sends rate,
             * it overrides Pricing List.
             */

            if (
                array_key_exists('rate', $billing)
                && $billing['rate'] !== null
            ) {

                $rate = (float) $billing['rate'];
            }

            // Do not reuse an old package rate when there is no current Pricing List.
            // A Logistics rate must be explicitly supplied for this bill.
            if ($rate === null) {
                $rate = 0;
            }

            // A Logistics rate is allowed to be entered later because rates can
            // change daily. When no rate is supplied, create a Billing Draft rather
            // than blocking the warehouse workflow or inventing a price.
            $isBillingDraft = $rate <= 0;

            /*
             * ---------------------------------------------------------
             * 9. CHARGEABLE QUANTITY
             * ---------------------------------------------------------
             */

            if ($rateType === 'KG') {

                $chargeable = $finalWeight;

            } else {

                $chargeable = max(
                    $finalCbm,
                    $minimumCbm
                );
            }

            /*
             * ---------------------------------------------------------
             * 10. SHIPPING COST
             * ---------------------------------------------------------
             */

            $shippingCost = round(
                $chargeable * $rate,
                2
            );

            /*
             * ---------------------------------------------------------
             * 11. FEES
             * ---------------------------------------------------------
             */

            $deliveryFee =
                array_key_exists(
                    'delivery_fee',
                    $billing
                )
                    ? (float) $billing['delivery_fee']
                    : (float) (
                        $package->delivery_fee ?? 0
                    );

            $handlingFee =
                array_key_exists(
                    'handling_fee',
                    $billing
                )
                    ? (float) $billing['handling_fee']
                    : (float) (
                        $package->handling_fee ?? 0
                    );

            $warehouseFee =
                array_key_exists(
                    'warehouse_fee',
                    $billing
                )
                    ? (float) $billing['warehouse_fee']
                    : (float) (
                        $package->warehouse_fee ?? 0
                    );

            $otherFee =
                array_key_exists(
                    'other_fee',
                    $billing
                )
                    ? (float) $billing['other_fee']
                    : (float) (
                        $package->other_fee ?? 0
                    );

            $discount =
                array_key_exists(
                    'discount',
                    $billing
                )
                    ? (float) $billing['discount']
                    : (float) (
                        $package->discount ?? 0
                    );

            /*
             * ---------------------------------------------------------
             * 12. GRAND TOTAL
             * ---------------------------------------------------------
             */

            $subtotal =
                $deliveryFee
                + $handlingFee
                + $warehouseFee;

            $discount = min(
                $subtotal
                + $shippingCost
                + $otherFee,
                $discount
            );

            $grandTotal = round(
                max(
                    0,
                    $subtotal
                    + $shippingCost
                    + $otherFee
                    - $discount
                ),
                2
            );

            /*
             * ---------------------------------------------------------
             * 13. UPDATE PRICING SNAPSHOT
             * ---------------------------------------------------------
             */

            if (is_array($pricingSnapshot)) {

                $pricingSnapshot['pricing_type'] =
                    $pricingType;

                $pricingSnapshot['rate'] =
                    $rate;

                $pricingSnapshot['rate_type'] =
                    $rateType;

                $pricingSnapshot['chargeable'] =
                    $chargeable;

                $pricingSnapshot['final_cbm'] =
                    $finalCbm;

                $pricingSnapshot['final_weight'] =
                    $finalWeight;

                $pricingSnapshot['shipping_cost'] =
                    $shippingCost;

                $pricingSnapshot['rate_source'] =
                    $isBillingDraft ? 'Manual current rate required' : ($pricing ? 'Pricing List / override' : 'Manual current rate');

            } else {

                $pricingSnapshot = [
                    'pricing_id' =>
                        $pricingId,

                    'rate_name' =>
                        null,

                    'shipping_mode' =>
                        $shippingMode,

                    'pricing_type' =>
                        $pricingType,

                    'origin' =>
                        $origin,

                    'destination' =>
                        $destination,

                    'rate_type' =>
                        $rateType,

                    'rate' =>
                        $rate,

                    'minimum_cbm' =>
                        $minimumCbm,

                    'chargeable' =>
                        $chargeable,

                    'final_cbm' =>
                        $finalCbm,

                    'final_weight' =>
                        $finalWeight,

                    'shipping_cost' =>
                        $shippingCost,

                    'currency' =>
                        'USD',

                    'effective_date' =>
                        null,

                    'expiry_date' =>
                        null,

                    'rate_source' =>
                        $isBillingDraft ? 'Manual current rate required' : 'Manual current rate',
                ];
            }

            /*
             * ---------------------------------------------------------
             * 14. UPDATE PACKAGE FINAL BILLING SNAPSHOT
             * ---------------------------------------------------------
             */

            $package->total_cbm =
                $finalCbm;

            $package->total_weight =
                $finalWeight;

            $package->pricing_type =
                $pricingType;

            $package->pricing_id =
                $pricingId;

            $package->pricing_rate_type =
                $rateType;

            $package->shipping_rate =
                $rate;

            $package->shipping_cost =
                $shippingCost;

            $package->delivery_fee =
                $deliveryFee;

            $package->handling_fee =
                $handlingFee;

            $package->warehouse_fee =
                $warehouseFee;

            $package->other_fee =
                $otherFee;

            $package->discount =
                $discount;

            $package->grand_total =
                $grandTotal;

            if (!$isBillingDraft && in_array((string) $package->status, ['Measurement Completed', 'Ready for Billing', 'Cambodia Warehouse'], true)) {
                $package->status = 'Invoiced';
            }

            $package->save();

            if (!$isBillingDraft && $package->status === 'Invoiced') {
                TrackingEvent::create([
                    'tracking_number' => $package->tracking_number,
                    'package_id' => $package->id,
                    'status' => 'Invoiced',
                    'location' => $package->warehouse_location ?: 'Cambodia Warehouse',
                    'warehouse' => 'Cambodia Warehouse',
                    'staff_name' => auth()->user()?->name ?? 'Billing',
                    'note' => 'Billing rate confirmed and invoice issued',
                    'event_at' => now(),
                ]);
            }

            /*
             * ---------------------------------------------------------
             * 15. INVOICE ITEM
             * ---------------------------------------------------------
             */

            $cbm = $finalCbm;

            // Quantity represents the number of boxes/items, not CBM.
            
            $boxCount = (int) ($package->box_count ?? 0);
            $itemQuantity = (int) ($package->quantity ?? 0);

            $quantity = max(
                1,
                $boxCount > 0
                    ? $boxCount
                    : $itemQuantity
            );


            $items = [
                [
                    'type' =>
                        'shipping',

                    'package_id' =>
                        $package->id,

                    'package_number' =>
                        $package->package_id,

                    'description' =>
                        trim(
                            (string) (
                                $package->product_name
                                ?: $package->product_category
                                ?: 'Logistics Service'
                            )
                        ),

                    'tracking_number' =>
                        $package->tracking_number,

                    'china_waybill_number' =>
                        $package->china_waybill_number
                        ?: $package->tracking_number,

                    'hfl_package_code' =>
                        $package->hfl_package_code,

                    'quantity' =>
                        $quantity,

                    'cbm' =>
                        $cbm,

                    'weight' =>
                        $finalWeight,

                    'unit_price' =>
                        $rate,

                    'amount' =>
                        round(
                            $shippingCost,
                            2
                        ),
                ],
            ];

            if ($deliveryFee > 0) {

                $items[] =
                    $this->feeItem(
                        $package,
                        'Delivery Fee',
                        $deliveryFee,
                        $finalCbm,
                        $finalWeight
                    );
            }

            if ($handlingFee > 0) {

                $items[] =
                    $this->feeItem(
                        $package,
                        'Handling Fee',
                        $handlingFee,
                        $finalCbm,
                        $finalWeight
                    );
            }

            if ($warehouseFee > 0) {

                $items[] =
                    $this->feeItem(
                        $package,
                        'Warehouse Fee',
                        $warehouseFee,
                        $finalCbm,
                        $finalWeight
                    );
            }

            if ($otherFee > 0) {

                $items[] =
                    $this->feeItem(
                        $package,
                        'Other Fee',
                        $otherFee,
                        $finalCbm,
                        $finalWeight
                    );
            }

            /*
             * ---------------------------------------------------------
             * 16. INVOICE META
             * ---------------------------------------------------------
             */

            $meta = [
                'bill_date' =>
                    now()->toDateString(),

                'customer_phone' =>
                    $customer?->phone,

                'customer_address' =>
                    $customer?->address,

                'origin' =>
                    $shipment?->origin
                    ?: $package->from_warehouse,

                'destination' =>
                    $shipment?->destination
                    ?: $package->to_warehouse,

                'shipping_method' =>
                    $shipment?->shipping_mode
                    ?: $package->shipping_mode,

                'tracking_number' =>
                    $package->tracking_number,

                'china_waybill_number' =>
                    $package->china_waybill_number
                    ?: $package->tracking_number,

                'hfl_package_code' =>
                    $package->hfl_package_code,

                'package_id' =>
                    $package->package_id,

                'shipment_number' =>
                    $shipment?->shipment_number,

                'container_number' =>
                    $container?->container_number,

                'final_cbm' =>
                    $finalCbm,

                'final_weight' =>
                    $finalWeight,

                'pricing_type' =>
                    $pricingType,

                'rate' =>
                    $rate,

                'rate_type' =>
                    $rateType,

                'shipping_cost' =>
                    $shippingCost,

                'delivery_fee' =>
                    $deliveryFee,

                'handling_fee' =>
                    $handlingFee,

                'warehouse_fee' =>
                    $warehouseFee,

                'other_fee' =>
                    $otherFee,

                'discount' =>
                    $discount,

                'payment_method' =>
                    null,

                'payment_date' =>
                    null,

                'payment_reference' =>
                    null,
            ];

            /*
             * ---------------------------------------------------------
             * 17. CREATE INVOICE
             * ---------------------------------------------------------
             */

            $invoice = new Invoice();

            $invoice->invoice_no =
                'TMP-INV-' . Str::uuid();

            $invoice->quotation_id =
                null;

            $invoice->customer_id =
                $package->customer_id;

            $invoice->customer_name =
                $package->customer_name
                ?: $customer?->full_name;

            $invoice->status =
                $isBillingDraft ? 'Draft' : 'Unpaid';

            $invoice->items =
                $items;

            $invoice->pricing_snapshot =
                $pricingSnapshot;

            $invoice->meta =
                $meta;

            $invoice->subtotal =
                round(
                    $subtotal,
                    2
                );

            $invoice->discount =
                round(
                    $discount,
                    2
                );

            $invoice->tax =
                0;

            $invoice->grand_total =
                round(
                    $grandTotal,
                    2
                );

            $invoice->paid_amount =
                0;

            $invoice->outstanding =
                $isBillingDraft
                    ? 0
                    : round($grandTotal, 2);

            $invoice->due_date =
                $billing['due_date']
                ?? now()
                    ->addDays(7)
                    ->toDateString();

            $invoice->save();

            /*
             * ---------------------------------------------------------
             * 18. FINAL INVOICE NUMBER
             * ---------------------------------------------------------
             */

            $invoice->invoice_no =
                $this->finalizeInvoiceNumber(
                    $invoice->id
                );

            $invoice->save();

            /*
             * ---------------------------------------------------------
             * 19. PACKAGE STATUS
             * ---------------------------------------------------------
             */

            // Only a priced, non-draft invoice may move an eligible
            // package into the Invoiced stage.
            $invoiceCanSetInvoicedStatus =
                !$isBillingDraft
                && in_array(
                    (string) $package->status,
                    [
                        'Measurement Completed',
                        'Ready for Billing',
                        'Cambodia Warehouse',
                    ],
                    true
                );

            if ($invoiceCanSetInvoicedStatus) {
                $package->status = 'Invoiced';
                $package->save();

                TrackingEvent::create([
                    'tracking_number' => $package->tracking_number,
                    'package_id' => $package->id,
                    'status' => 'Invoiced',
                    'location' => $package->warehouse_location ?: 'Cambodia Warehouse',
                    'warehouse' => 'Cambodia Warehouse',
                    'staff_name' => auth()->user()?->name ?? 'Billing',
                    'note' => 'Billing rate confirmed and invoice issued',
                    'event_at' => now(),
                ]);
            }

            /*
             * ---------------------------------------------------------
             * 20. PAYMENT HISTORY
             * ---------------------------------------------------------
             */

            $invoice->setAttribute(
                'payments',
                collect()
            );

            return $this->ok(
                $invoice,
                'Invoice generated from package successfully.'
            );
        });
    }

    /**
     * One combined bill for several packages (tracking numbers) of ONE customer.
     *
     * Each package is priced by the existing fromPackage() logic, so every
     * tracking keeps its own origin / shipping mode / GC-SC rate. Delivery,
     * handling, warehouse, other fees and discount are charged ONCE (on the
     * first package); the other packages get 0 for those fees.
     */
    public function fromPackages(Request $request)
    {
        $data = $request->validate([
            'package_ids' => 'required|array|min:2|max:50',
            'package_ids.*' => 'required',
            'delivery_fee' => 'nullable|numeric|min:0',
            'handling_fee' => 'nullable|numeric|min:0',
            'warehouse_fee' => 'nullable|numeric|min:0',
            'other_fee' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);

        $ids = array_values(array_unique(array_map('strval', $data['package_ids'])));
        if (count($ids) < 2) {
            return $this->fail('Select at least 2 different packages for a combined bill.', [], 422);
        }

        DB::beginTransaction();

        try {
            $created = [];

            foreach ($ids as $index => $packageId) {
                $payload = array_filter([
                    'due_date' => $data['due_date'] ?? null,
                ], fn ($v) => $v !== null);

                foreach (['delivery_fee', 'handling_fee', 'warehouse_fee', 'other_fee', 'discount'] as $field) {
                    if ($index === 0) {
                        if (array_key_exists($field, $data) && $data[$field] !== null) {
                            $payload[$field] = $data[$field];
                        }
                    } else {
                        $payload[$field] = 0;
                    }
                }

                $sub = Request::create('/', 'POST', $payload);
                $sub->setUserResolver($request->getUserResolver());

                $response = $this->fromPackage($sub, $packageId);
                $body = json_decode($response->getContent(), true) ?: [];

                if ($response->getStatusCode() >= 400 || empty($body['success'])) {
                    DB::rollBack();
                    return $this->fail(
                        'Package ' . $packageId . ': ' . ($body['message'] ?? 'cannot be billed.'),
                        $body['errors'] ?? [],
                        422
                    );
                }

                if (($body['message'] ?? '') !== 'Invoice generated from package successfully.') {
                    DB::rollBack();
                    return $this->fail(
                        'Package ' . $packageId . ' already has an invoice. Remove it from the selection.',
                        [],
                        422
                    );
                }

                $invoice = Invoice::where('is_test', false)
                    ->findOrFail($body['data']['id']);

                if ((string) $invoice->status === 'Draft') {
                    DB::rollBack();
                    return $this->fail(
                        'Package ' . $packageId . ' has no active pricing rate (Draft). Set the rate first, then combine.',
                        [],
                        422
                    );
                }

                if ($created && (string) $invoice->customer_id !== (string) $created[0]->customer_id) {
                    DB::rollBack();
                    return $this->fail('All packages in a combined bill must belong to the same customer.', [], 422);
                }

                $created[] = $invoice;
            }

            $primary = $created[0];
            $items = is_array($primary->items) ? $primary->items : [];
            $breakdown = [];
            $subtotal = 0.0;
            $discount = 0.0;
            $grand = 0.0;

            foreach ($created as $index => $invoice) {
                $meta = is_array($invoice->meta) ? $invoice->meta : [];
                $breakdown[] = [
                    'package_id' => collect($invoice->items)->pluck('package_id')->filter()->first(),
                    'tracking_number' => collect($invoice->items)->pluck('tracking_number')->filter()->first(),
                    'final_cbm' => $meta['final_cbm'] ?? null,
                    'pricing_type' => $meta['pricing_type'] ?? null,
                    'rate' => $meta['rate'] ?? null,
                    'shipping_cost' => $meta['shipping_cost'] ?? null,
                ];

                $subtotal += (float) $invoice->subtotal;
                $discount += (float) $invoice->discount;
                $grand += (float) $invoice->grand_total;

                if ($index > 0) {
                    foreach ((is_array($invoice->items) ? $invoice->items : []) as $item) {
                        $items[] = $item;
                    }
                }
            }

            foreach (array_slice($created, 1) as $extra) {
                $extra->delete();
            }

            $meta = is_array($primary->meta) ? $primary->meta : [];
            $meta['combined'] = true;
            $meta['package_ids'] = collect($items)->pluck('package_id')->filter()->unique()->values()->all();
            $meta['packages'] = $breakdown;
            $meta['shipping_cost'] = round(collect($breakdown)->sum(fn ($b) => (float) ($b['shipping_cost'] ?? 0)), 2);

            $primary->items = $items;
            $primary->meta = $meta;
            $primary->subtotal = round($subtotal, 2);
            $primary->discount = round($discount, 2);
            $primary->grand_total = round($grand, 2);
            $primary->outstanding = round($grand, 2);
            $primary->save();

            DB::commit();

            $primary->setAttribute('payments', collect());

            return $this->ok($primary, 'Combined invoice generated for ' . count($created) . ' packages.');
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function feeItem(
        Package $package,
        string $description,
        float $amount,
        float $finalCbm = 0,
        float $finalWeight = 0
    ): array {

        return [
            'type' =>
                'fee',

            'package_id' =>
                $package->id,

            'package_number' =>
                $package->package_id,

            'description' =>
                $description,

            'tracking_number' =>
                $package->tracking_number,

            'china_waybill_number' =>
                $package->china_waybill_number
                ?: $package->tracking_number,

            'hfl_package_code' =>
                $package->hfl_package_code,

            'quantity' =>
                1,

            'cbm' =>
                $finalCbm,

            'weight' =>
                $finalWeight,

            'unit_price' =>
                round(
                    $amount,
                    2
                ),

            'amount' =>
                round(
                    $amount,
                    2
                ),
        ];
    }

    private function finalizeInvoiceNumber(
        int $id
    ): string {

        $date =
            now()->format('Ymd');

        $prefix =
            'HFL-INV-' . $date . '-';

        return $prefix
            . str_pad(
                (string) $id,
                6,
                '0',
                STR_PAD_LEFT
            );
    }
}
