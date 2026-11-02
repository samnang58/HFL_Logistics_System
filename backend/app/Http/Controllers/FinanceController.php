<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Income;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends ApiController
{
    public function dashboard(Request $request)
    {
        $from = $request->input('from');
        $to = $request->input('to');

        $incomeQuery = Income::query()->where('is_test', false);
        $expenseQuery = Expense::query();
        $paymentQuery = Payment::query()->where('is_test', false);

        if ($from) {
            $incomeQuery->whereDate('received_at', '>=', $from);
            $expenseQuery->whereDate('expense_date', '>=', $from);
            $paymentQuery->whereDate('paid_at', '>=', $from);
        }

        if ($to) {
            $incomeQuery->whereDate('received_at', '<=', $to);
            $expenseQuery->whereDate('expense_date', '<=', $to);
            $paymentQuery->whereDate('paid_at', '<=', $to);
        }

        $income = (float) $incomeQuery->sum('amount');

        $expense = (float) (clone $expenseQuery)
            ->where('status', 'Paid')
            ->sum('amount');

        $paidToday = (float) Payment::where('is_test', false)
            ->whereDate('paid_at', now()->toDateString())
            ->where('status', 'Confirmed')
            ->sum('amount');

        $outstanding = (float) Invoice::where('is_test', false)
            ->sum('outstanding');

        return $this->ok([
            'total_income' => $income,
            'total_expenses' => $expense,
            'pending_expenses' => (float) (clone $expenseQuery)
                ->where('status', 'Pending')
                ->sum('amount'),
            'net_profit' => $income - $expense,
            'total_paid' => (float) $paymentQuery
                ->where('status', 'Confirmed')
                ->sum('amount'),
            'paid_today' => $paidToday,
            'outstanding' => $outstanding,
            'invoice_count' => Invoice::where('is_test', false)->count(),
            'payment_count' => Payment::where('is_test', false)->count(),
            'expense_count' => (clone $expenseQuery)->count(),
            'recent_payments' => Payment::where('is_test', false)
                ->latest('paid_at')
                ->limit(10)
                ->get(),
            'recent_expenses' => Expense::latest('expense_date')
                ->limit(10)
                ->get(),
        ]);
    }

    public function statement(Request $request, string $customerId)
    {
        $invoices = Invoice::where('is_test', false)
            ->where('customer_id', $customerId)
            ->orderByDesc('created_at')
            ->get();

        $payments = Payment::where('is_test', false)
            ->where('customer_id', $customerId)
            ->orderByDesc('paid_at')
            ->get();

        $income = Income::where('is_test', false)
            ->where('customer_id', $customerId)
            ->orderByDesc('received_at')
            ->get();

        $invoiced = (float) $invoices->sum('grand_total');

        $paid = (float) $payments
            ->where('status', 'Confirmed')
            ->sum('amount');

        return $this->ok([
            'customer_id' => $customerId,
            'invoices' => $invoices,
            'payments' => $payments,
            'income' => $income,
            'summary' => [
                'invoiced' => $invoiced,
                'paid' => $paid,
                'outstanding' => max(0, $invoiced - $paid),
            ],
        ]);
    }

    public function receipt(int $paymentId)
    {
        $payment = Payment::where('is_test', false)
            ->findOrFail($paymentId);

        $invoice = $payment->invoice_id
            ? Invoice::where('is_test', false)
                ->find($payment->invoice_id)
            : null;

        return $this->ok([
            'payment' => $payment,
            'invoice' => $invoice,
        ]);
    }

    public function paymentTracking(Request $request)
    {
        $data = $request->validate([
            'status' => 'nullable|in:All,Unpaid,Partially Paid,Paid,Overdue',
            'search' => 'nullable|string|max:150',
            'per_page' => 'nullable|integer|min:1|max:100',
            'page' => 'nullable|integer|min:1',
        ]);

        $status = $data['status'] ?? 'All';
        $search = trim($data['search'] ?? '');
        $today = now()->toDateString();

        $query = Invoice::query()
            ->where('is_test', false)
            ->where(function ($q) {
                $q->whereNull('status')
                    ->orWhereRaw(
                        'LOWER(status) NOT IN (?, ?, ?)',
                        ['draft', 'cancelled', 'void']
                    );
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                    ->orWhere('customer_id', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($status === 'Paid') {
            $query->where('outstanding', '<=', 0);

        } elseif ($status === 'Overdue') {
            $query->where('outstanding', '>', 0)
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', $today);

        } elseif ($status === 'Partially Paid') {
            $query->where('outstanding', '>', 0)
                ->where('paid_amount', '>', 0)
                ->where(function ($q) use ($today) {
                    $q->whereNull('due_date')
                        ->orWhereDate('due_date', '>=', $today);
                });

        } elseif ($status === 'Unpaid') {
            $query->where('outstanding', '>', 0)
                ->where(function ($q) {
                    $q->whereNull('paid_amount')
                        ->orWhere('paid_amount', '<=', 0);
                })
                ->where(function ($q) use ($today) {
                    $q->whereNull('due_date')
                        ->orWhereDate('due_date', '>=', $today);
                });
        }

        $invoices = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($data['per_page'] ?? 25));

        $invoices->getCollection()->transform(
            function ($invoice) use ($today) {
                $outstanding = (float) ($invoice->outstanding ?? 0);
                $paid = (float) ($invoice->paid_amount ?? 0);

                $dueDate = $invoice->due_date
                    ? substr((string) $invoice->due_date, 0, 10)
                    : null;

                if (
                    $outstanding > 0 &&
                    $dueDate !== null &&
                    $dueDate < $today
                ) {
                    $paymentStatus = 'Overdue';
                } elseif ($outstanding <= 0) {
                    $paymentStatus = 'Paid';
                } elseif ($paid > 0) {
                    $paymentStatus = 'Partially Paid';
                } else {
                    $paymentStatus = 'Unpaid';
                }

                $items = collect($invoice->items ?? [])
                    ->filter(fn ($item) => is_array($item));

                $shippingItems = $items->filter(
                    fn ($item) => !empty($item['package_id'])
                );

                $uniquePackages = $shippingItems->unique(
                    fn ($item) => (string) $item['package_id']
                );

                $trackingNumbers = $shippingItems
                    ->pluck('tracking_number')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $meta = is_array($invoice->meta)
                    ? $invoice->meta
                    : [];

                $containerNumbers = collect([
                    $meta['container_number'] ?? null,
                ])
                    ->merge($shippingItems->pluck('container_number'))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $packageCount = $uniquePackages->count();

                $cbm = round(
                    (float) $uniquePackages->sum(
                        fn ($item) => (float) ($item['cbm'] ?? 0)
                    ),
                    3
                );

                return [
                    'id' => $invoice->id,
                    'invoice_no' => $invoice->invoice_no,
                    'customer_id' => $invoice->customer_id,
                    'customer_name' => $invoice->customer_name,
                    'tracking_numbers' => $trackingNumbers,
                    'container_numbers' => $containerNumbers,
                    'package_count' => $packageCount,
                    'cbm' => $cbm,
                    'grand_total' => (float) ($invoice->grand_total ?? 0),
                    'paid_amount' => $paid,
                    'outstanding' => $outstanding,
                    'due_date' => $dueDate,
                    'payment_status' => $paymentStatus,
                ];
            }
        );

        return $this->ok($invoices);
    }
}
