<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LegacyPackageBrowserController extends ApiController
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:120',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        $query = DB::table('legacy_packages as lp')
            ->leftJoin(
                'customers as c',
                'c.customer_id',
                '=',
                'lp.customer_id'
            );

        $search = trim((string)($data['search'] ?? ''));

        if ($search !== '') {
            $escaped = str_replace(
                ['\\', '%', '_'],
                ['\\\\', '\%', '\_'],
                $search
            );

            $term = '%' . $escaped . '%';

            $query->where(function ($q) use ($term) {
                $q->where('lp.legacy_package_id', 'like', $term)
                    ->orWhere('lp.customer_id', 'like', $term)
                    ->orWhere('lp.source_code', 'like', $term)
                    ->orWhere('lp.tracking_raw', 'like', $term);
            });
        }

        $result = $query
            ->select([
                'lp.id',
                'lp.legacy_package_id',
                'lp.customer_id',
                'lp.source_code',
                'lp.tracking_raw',
                'lp.shipping_date',
                'lp.shipping_datetime',
                'lp.shipping_mode',
                'lp.source_status',
                'lp.weight_kg',
                'lp.volume_cbm',
                'lp.item_count',
                'c.id as customer_record_id',
            ])
            ->orderByDesc('lp.shipping_datetime')
            ->orderByDesc('lp.id')
            ->paginate((int)($data['per_page'] ?? 25));

        return $this->ok($result);
    }

    public function show(int $id)
    {
        $package = DB::table('legacy_packages')
            ->where('id', $id)
            ->first();

        if (!$package) {
            abort(404, 'Historical package not found.');
        }

        $source = json_decode(
            (string)$package->source_payload,
            true
        );

        $container = is_array($source)
            ? trim((string)($source['parent_csv_row'][10] ?? ''))
            : '';

        if (
            strlen($container) >= 2 &&
            str_starts_with($container, '"') &&
            str_ends_with($container, '"')
        ) {
            $container = trim(substr($container, 1, -1));
        }

        $package->legacy_container_id =
            $container !== '' ? $container : null;

        $package->items = json_decode(
            (string)($package->items ?? '[]'),
            true
        ) ?: [];

        // Do not expose the full archived CSV payload.
        unset($package->source_payload);

        $historyQuery = DB::table('legacy_package_history')
            ->where('legacy_package_row_id', $id);

        $package->history_count =
            (clone $historyQuery)->count();

        $package->history = $historyQuery
            ->select([
                'id',
                'status',
                'event_at',
                'is_return',
                'return_at',
            ])
            ->orderBy('event_at')
            ->orderBy('id')
            ->limit(500)
            ->get();

        return $this->ok($package);
    }
}
