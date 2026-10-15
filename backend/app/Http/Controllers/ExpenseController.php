<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Container;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExpenseController extends CrudController
{
    protected string $model = Expense::class;

    protected array $rules = [
        'expense_type' => 'required|string|max:100',
        'category' => 'required|string|max:100',
        'description' => 'nullable|string|max:1000',
        'vendor' => 'nullable|string|max:255',
        'amount' => 'required|numeric|gt:0',
        'currency' => 'nullable|string|max:10',
        'payment_method' => 'nullable|string|max:50',
        'payment_reference' => 'nullable|string|max:255',
        'expense_date' => 'required|date',
        'paid_at' => 'nullable|date',
        'status' => 'required|in:Pending,Paid,Cancelled',
        'reference' => 'nullable|string|max:255',
        'shipment_id' => 'nullable|integer|exists:shipments,id',
        'container_id' => 'nullable|integer|exists:containers,id',
        'package_id' => 'nullable|integer|exists:packages,id',
        'delivery_id' => 'nullable|integer|exists:deliveries,id',
        'notes' => 'nullable|string|max:2000',
    ];

    protected function searchColumns(): array
    {
        return ['expense_no', 'category', 'description', 'vendor', 'reference', 'status'];
    }

    /**
     * Delivery cost report: what was spent on Tuk Tuk / VET / Grab / rental van...
     * versus the delivery fee charged to customers, for an optional date range.
     */
    public function deliverySummary(Request $request)
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $costs = Expense::query()
            ->where('expense_type', 'Delivery Cost')
            ->where('status', '!=', 'Cancelled');

        if ($from) {
            $costs->whereDate('expense_date', '>=', $from);
        }
        if ($to) {
            $costs->whereDate('expense_date', '<=', $to);
        }

        $rows = $costs->get(['category', 'amount', 'status']);

        $paid = (float) $rows->where('status', 'Paid')->sum('amount');
        $pending = (float) $rows->where('status', 'Pending')->sum('amount');

        $byCategory = $rows->groupBy('category')->map(function ($group, $category) {
            return [
                'category' => $category ?: 'Other',
                'count' => $group->count(),
                'amount' => round((float) $group->sum('amount'), 2),
            ];
        })->sortByDesc('amount')->values();

        $invoiceQuery = Invoice::query()->where('is_test', false)->whereNotIn('status', ['Cancelled', 'Draft', 'Void']);
        if ($from) {
            $invoiceQuery->whereDate('created_at', '>=', $from);
        }
        if ($to) {
            $invoiceQuery->whereDate('created_at', '<=', $to);
        }

        $feeRevenue = 0.0;
        foreach ($invoiceQuery->get(['id', 'meta']) as $invoice) {
            $meta = is_array($invoice->meta) ? $invoice->meta : [];
            $feeRevenue += (float) ($meta['delivery_fee'] ?? 0);
        }

        return $this->ok([
            'delivery_fee_revenue' => round($feeRevenue, 2),
            'delivery_cost_paid' => round($paid, 2),
            'delivery_cost_pending' => round($pending, 2),
            'delivery_margin' => round($feeRevenue - $paid, 2),
            'by_category' => $byCategory,
        ]);
    }

    /**
     * The form lets people type a business code (HFL-SHP-2026-000001, a container number,
     * a tracking number...) instead of the internal database id. Convert codes to ids here.
     */
    private function resolveLinks(Request $request): void
    {
        $lookups = [
            'shipment_id' => ['label' => 'Shipment', 'model' => Shipment::class, 'columns' => ['shipment_number']],
            'container_id' => ['label' => 'Container', 'model' => Container::class, 'columns' => ['container_number', 'code']],
            'package_id' => ['label' => 'Package', 'model' => Package::class, 'columns' => ['tracking_number', 'china_waybill_number', 'hfl_package_code', 'code']],
        ];

        $merge = [];
        $errors = [];

        foreach ($lookups as $field => $cfg) {
            if (!$request->has($field)) {
                continue;
            }

            $value = trim((string) $request->input($field));

            if ($value === '') {
                $merge[$field] = null;
                continue;
            }

            if (ctype_digit($value)) {
                $merge[$field] = (int) $value;
                continue;
            }

            $modelClass = $cfg['model'];
            $found = null;

            foreach ($cfg['columns'] as $column) {
                $found = $modelClass::query()->where($column, $value)->first();
                if ($found) {
                    break;
                }
            }

            if (!$found) {
                $errors[$field] = [$cfg['label'] . ' "' . $value . '" was not found. Check the number, or leave it empty.'];
                continue;
            }

            $merge[$field] = $found->id;
        }

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $request->merge($merge);
    }

    /**
     * Adds the readable link info (customer, tracking, delivery no.) to expense rows,
     * so the list and the detail window can show WHICH delivery / package a cost belongs to.
     */
    private function enrich($expenses)
    {
        $list = collect($expenses);

        $packages = Package::whereIn('id', $list->pluck('package_id')->filter()->unique())
            ->get(['id', 'tracking_number', 'hfl_package_code', 'product_name', 'customer_id'])
            ->keyBy('id');

        $deliveries = Delivery::whereIn('id', $list->pluck('delivery_id')->filter()->unique())
            ->get(['id', 'delivery_number', 'status', 'customer_id', 'package_id', 'delivery_address', 'phone', 'delivered_at'])
            ->keyBy('id');

        $customerIds = $packages->pluck('customer_id')
            ->merge($deliveries->pluck('customer_id'))
            ->filter()->unique();

        $customers = Customer::whereIn('customer_id', $customerIds)->pluck('full_name', 'customer_id');

        return $list->map(function ($expense) use ($packages, $deliveries, $customers) {
            $delivery = $deliveries->get($expense->delivery_id);
            $package = $packages->get($expense->package_id)
                ?? ($delivery ? Package::find($delivery->package_id, ['id', 'tracking_number', 'hfl_package_code', 'product_name', 'customer_id']) : null);
            $customerId = $package->customer_id ?? $delivery->customer_id ?? null;

            $expense->setAttribute('customer_id', $customerId);
            $expense->setAttribute('customer_name', $customerId ? ($customers[$customerId] ?? $customerId) : null);
            $expense->setAttribute('tracking_number', $package->tracking_number ?? null);
            $expense->setAttribute('hfl_package_code', $package->hfl_package_code ?? null);
            $expense->setAttribute('product_name', $package->product_name ?? null);
            $expense->setAttribute('delivery_number', $delivery->delivery_number ?? null);
            $expense->setAttribute('delivery_status', $delivery->status ?? null);
            $expense->setAttribute('delivery_address', $delivery->delivery_address ?? null);

            return $expense;
        })->values();
    }

    public function index(Request $request)
    {
        $query = Expense::query();

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                foreach ($this->searchColumns() as $column) {
                    $q->orWhere($column, 'like', '%' . $search . '%');
                }
            });
        }

        foreach (['status', 'expense_type', 'category'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->input('to'));
        }

        $page = $query->orderByDesc('expense_date')->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 25));

        $page->setCollection($this->enrich($page->getCollection()));

        return $this->ok($page);
    }

    public function show($id)
    {
        $expense = Expense::with(['creator:id,name'])->findOrFail($id);

        return $this->ok($this->enrich([$expense])->first());
    }

    public function store(Request $request)
    {
        $this->resolveLinks($request);
        $data = $request->validate($this->rules);

        return DB::transaction(function () use ($data, $request) {
            $expense = new Expense();
            $expense->expense_no = 'TMP-EXP-' . Str::uuid();
            $expense->expense_type = $data['expense_type'];
            $expense->category = $data['category'];
            $expense->description = $data['description'] ?? null;
            $expense->vendor = $data['vendor'] ?? null;
            $expense->amount = $data['amount'];
            $expense->currency = $data['currency'] ?? 'USD';
            $expense->payment_method = $data['payment_method'] ?? null;
            $expense->payment_reference = $data['payment_reference'] ?? null;
            $expense->expense_date = $data['expense_date'];
            $expense->status = $data['status'];
            $expense->reference = $data['reference'] ?? null;
            $expense->shipment_id = $data['shipment_id'] ?? null;
            $expense->container_id = $data['container_id'] ?? null;
            $expense->package_id = $data['package_id'] ?? null;
            $expense->delivery_id = $data['delivery_id'] ?? null;
            $expense->created_by = $request->user()?->id;
            $expense->notes = $data['notes'] ?? null;

            if ($expense->status === 'Paid') {
                $expense->paid_at = $data['paid_at'] ?? now();
            } else {
                $expense->paid_at = null;
            }

            $expense->save();
            $expense->expense_no = 'HFL-EXP-' . str_pad((string) $expense->id, 6, '0', STR_PAD_LEFT);
            $expense->save();

            return $this->ok($expense->fresh()->load(['shipment', 'container', 'package']), 'Expense created');
        });
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        $this->resolveLinks($request);
        $rules = $this->rules;
        foreach ($rules as $field => $rule) {
            $rules[$field] = str_replace('required|', '', $rule);
        }
        $data = $request->validate($rules);

        return DB::transaction(function () use ($expense, $data) {
            if (($data['status'] ?? $expense->status) === 'Paid') {
                $data['paid_at'] = $data['paid_at'] ?? $expense->paid_at ?? now();
            } elseif (array_key_exists('status', $data) && $data['status'] !== 'Paid') {
                $data['paid_at'] = null;
            }

            $expense->update($data);
            return $this->ok($expense->fresh()->load(['shipment', 'container', 'package']), 'Expense updated');
        });
    }
}
