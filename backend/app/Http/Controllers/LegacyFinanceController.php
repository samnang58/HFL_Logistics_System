<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Read-only browser for ERPNext finance archives in a separate staging database.
 * All routes are protected by auth:sanctum, active-staff and finance permissions.
 */
class LegacyFinanceController extends Controller
{
    private const STAGE = 'hfl_logistics_staging';

    private function archive(string $kind)
    {
        $table = $kind === 'invoices'
            ? 'erpnext_sales_invoices'
            : 'erpnext_payment_entries';

        $db = DB::connection();
        if ($db->getDatabaseName() !== 'hfl_logistics') {
            abort(503, 'Legacy finance archive is not configured on this server.');
        }

        $exists = $db->selectOne(
            'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES '
            . 'WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [self::STAGE, $table]
        );
        if (!$exists) {
            abort(503, 'Legacy finance archive is not available.');
        }

        return $db->table(self::STAGE . '.' . $table);
    }

    public function invoices(Request $request)
    {
        return $this->index($request, 'invoices');
    }

    public function payments(Request $request)
    {
        return $this->index($request, 'payments');
    }

    public function invoice(string $name)
    {
        return $this->show($name, 'invoices');
    }

    public function payment(string $name)
    {
        return $this->show($name, 'payments');
    }

    private function index(Request $request, string $kind)
    {
        $params = $request->validate([
            'search' => 'nullable|string|max:100',
            'customer_id' => 'nullable|string|max:191',
            'status' => 'nullable|string|max:50',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = $this->archive($kind)
            ->select(['erpnext_name', 'source_modified', 'payload_json']);

        if (!empty($params['search'])) {
            // Escape LIKE wildcards: the user's text must be matched literally.
            $term = addcslashes($params['search'], '%_\\');
            $query->where('erpnext_name', 'like', '%' . $term . '%');
        }

        if (!empty($params['customer_id'])) {
            $field = $kind === 'invoices' ? '$.customer' : '$.party';
            $query->whereRaw(
                'JSON_UNQUOTE(JSON_EXTRACT(payload_json, ?)) = ?',
                [$field, $params['customer_id']]
            );
        }
        if (!empty($params['status'])) {
            $query->whereRaw(
                'JSON_UNQUOTE(JSON_EXTRACT(payload_json, ?)) = ?',
                ['$.status', $params['status']]
            );
        }

        $page = $query->orderBy('erpnext_name')
            ->paginate((int) ($params['per_page'] ?? 25));

        $rows = collect($page->items())->map(function ($row) use ($kind) {
            $doc = json_decode($row->payload_json, true, 512, JSON_THROW_ON_ERROR);
            $base = [
                'name' => $row->erpnext_name,
                'modified' => $row->source_modified,
                'docstatus' => $doc['docstatus'] ?? null,
                'status' => $doc['status'] ?? null,
                'posting_date' => $doc['posting_date'] ?? null,
            ];
            if ($kind === 'invoices') {
                return $base + [
                    'customer_id' => $doc['customer'] ?? null,
                    'customer_name' => $doc['customer_name'] ?? null,
                    'currency' => $doc['currency'] ?? null,
                    'grand_total' => $doc['grand_total'] ?? null,
                    'outstanding_amount' => $doc['outstanding_amount'] ?? null,
                ];
            }
            return $base + [
                'party_type' => $doc['party_type'] ?? null,
                'party_id' => $doc['party'] ?? null,
                'payment_type' => $doc['payment_type'] ?? null,
                'paid_amount' => $doc['paid_amount'] ?? null,
                'allocated_amount' => $doc['total_allocated_amount'] ?? null,
                'unallocated_amount' => $doc['unallocated_amount'] ?? null,
            ];
        })->all();

        return response()->json([
            'data' => $rows,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'read_only' => true,
                'source' => 'ERPNext staging snapshot',
            ],
        ]);
    }

    private function show(string $name, string $kind)
    {
        if (strlen($name) > 191 || $name === '') {
            abort(404);
        }
        $row = $this->archive($kind)->where('erpnext_name', $name)->first();
        if (!$row) {
            abort(404);
        }
        return response()->json([
            'data' => json_decode($row->payload_json, true, 512, JSON_THROW_ON_ERROR),
            'meta' => [
                'read_only' => true,
                'source' => 'ERPNext staging snapshot',
                'source_modified' => $row->source_modified,
                'payload_sha256' => $row->payload_sha256,
            ],
        ]);
    }
}
