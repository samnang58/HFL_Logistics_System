<?php

namespace App\Http\Controllers;

use App\Models\Pricing;
use Illuminate\Http\Request;

class PricingController extends CrudController
{
    protected string $model = Pricing::class;

    protected array $rules = [
        'rate_name'      => 'required|string',
        'shipping_mode'  => 'required|in:SEA,LAND,AIR',
        'pricing_type'   => 'required|in:GC,SC',
        'origin'         => 'required|string',
        'destination'    => 'required|string',
        'rate_type'      => 'required|in:CBM,KG',
        'rate'           => 'required|numeric|min:0',
        'currency'       => 'nullable|string|max:10',
        'minimum_cbm'    => 'nullable|numeric|min:0',
        'effective_date' => 'nullable|date',
        'expiry_date'    => 'nullable|date',
        'status'         => 'nullable|string',
    ];

    protected function searchColumns(): array
    {
        return [
            'pricing_id',
            'rate_name',
            'shipping_mode',
            'pricing_type',
            'origin',
            'destination',
        ];
    }

    public function store(Request $r)
    {
        $d = $r->validate($this->rules);

        $n = Pricing::count() + 1;

        $d['pricing_id'] =
            'HFL-PRC-' . str_pad((string) $n, 6, '0', STR_PAD_LEFT);

        $d['status'] = $d['status'] ?? 'Active';

        return $this->ok(
            Pricing::create($d),
            'Created'
        );
    }

    /**
     * Find the currently active pricing rate.
     */
    public function findRate(Request $request)
    {
        $validated = $request->validate([
            'shipping_mode' => 'required|in:SEA,LAND,AIR',
            'pricing_type'  => 'required|in:GC,SC',
            'origin'        => 'required|string',
            'destination'   => 'required|string',
        ]);

        $normalize = static function (?string $value): string {
            $value = trim(strtolower((string) $value));
            $value = preg_replace('~[-,/_]+~', ' ', $value);
            $value = preg_replace('/\s+/', ' ', $value);
            $value = preg_replace('/\s+warehouse$/', '', $value);
            $value = preg_replace('/\s+china$/', '', $value);
            return trim($value);
        };
        $normalizeDestination = static function (?string $value) use ($normalize): string {
            $v = $normalize($value);
            if (in_array($v, ['cambodia','cambodia warehouse','phnom penh','phnom penh warehouse','phnom penh cambodia','phnom penh cambodia warehouse'], true)) {
                return 'cambodia warehouse';
            }
            return $v;
        };

        $today = now()->toDateString();
        $origin = $normalize($validated['origin']);
        $destination = $normalizeDestination($validated['destination']);

        $pricing = Pricing::query()
            ->where('shipping_mode', strtoupper($validated['shipping_mode']))
            ->where('pricing_type', strtoupper($validated['pricing_type']))
            ->where('status', 'Active')
            ->where(function ($q) use ($today) {
                $q->whereNull('effective_date')->orWhereDate('effective_date', '<=', $today);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('expiry_date')->orWhereDate('expiry_date', '>=', $today);
            })
            ->orderByDesc('effective_date')
            ->orderByDesc('id')
            ->get()
            ->first(function ($row) use ($normalize, $normalizeDestination, $origin, $destination) {
                return $normalize($row->origin) === $origin
                    && $normalizeDestination($row->destination) === $destination;
            });

        if (!$pricing) {
            $pricing = Pricing::query()
                ->where('shipping_mode', strtoupper($validated['shipping_mode']))
                ->where('pricing_type', strtoupper($validated['pricing_type']))
                ->where('status', 'Active')
                ->where(function ($q) use ($today) {
                    $q->whereNull('effective_date')->orWhereDate('effective_date', '<=', $today);
                })
                ->where(function ($q) use ($today) {
                    $q->whereNull('expiry_date')->orWhereDate('expiry_date', '>=', $today);
                })
                ->orderByDesc('effective_date')
                ->orderByDesc('id')
                ->get()
                ->first(function ($row) use ($normalize, $normalizeDestination, $destination) {
                    return in_array($normalize($row->origin), ['china', 'all china', 'china warehouses'], true)
                        && $normalizeDestination($row->destination) === $destination;
                });
        }

        if (!$pricing) {
            return response()->json([
                'success' => true,
                'message' => 'No active pricing found for this route.',
                'data' => null,
            ], 200);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pricing found.',
            'data' => [
                'pricing_id' => $pricing->pricing_id,
                'rate_name' => $pricing->rate_name,
                'shipping_mode' => $pricing->shipping_mode,
                'pricing_type' => $pricing->pricing_type,
                'origin' => $pricing->origin,
                'destination' => $pricing->destination,
                'rate_type' => $pricing->rate_type,
                'rate' => (float) $pricing->rate,
                'currency' => $pricing->currency,
                'minimum_cbm' => $pricing->minimum_cbm !== null ? (float) $pricing->minimum_cbm : null,
                'effective_date' => $pricing->effective_date,
                'expiry_date' => $pricing->expiry_date,
                'status' => $pricing->status,
            ],
        ]);
    }

}
