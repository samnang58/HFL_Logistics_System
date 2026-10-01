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
        $incomeQuery = Income::query();
        $expenseQuery = Expense::query();
        $paymentQuery = Payment::query();
        if ($from) { $incomeQuery->whereDate('received_at', '>=', $from); $expenseQuery->whereDate('expense_date', '>=', $from); $paymentQuery->whereDate('paid_at', '>=', $from); }
        if ($to) { $incomeQuery->whereDate('received_at', '<=', $to); $expenseQuery->whereDate('expense_date', '<=', $to); $paymentQuery->whereDate('paid_at', '<=', $to); }
        $income = (float)$incomeQuery->sum('amount');
        $expense = (float)(clone $expenseQuery)->where('status','Paid')->sum('amount');
        $paidToday = (float)Payment::whereDate('paid_at', now()->toDateString())->where('status','Confirmed')->sum('amount');
        $outstanding = (float)Invoice::sum('outstanding');
        return $this->ok([
            'total_income'=>$income,
            'total_expenses'=>$expense,
            'pending_expenses'=>(float)(clone $expenseQuery)->where('status','Pending')->sum('amount'),
            'net_profit'=>$income-$expense,
            'total_paid'=>(float)$paymentQuery->where('status','Confirmed')->sum('amount'),
            'paid_today'=>$paidToday,
            'outstanding'=>$outstanding,
            'invoice_count'=>Invoice::count(),
            'payment_count'=>Payment::count(),
            'expense_count'=>(clone $expenseQuery)->count(),
            'recent_payments'=>Payment::latest('paid_at')->limit(10)->get(),
            'recent_expenses'=>Expense::latest('expense_date')->limit(10)->get(),
        ]);
    }

    public function statement(Request $request, string $customerId)
    {
        $invoices = Invoice::where('customer_id',$customerId)->orderByDesc('created_at')->get();
        $payments = Payment::where('customer_id',$customerId)->orderByDesc('paid_at')->get();
        $income = Income::where('customer_id',$customerId)->orderByDesc('received_at')->get();
        $invoiced = (float)$invoices->sum('grand_total');
        $paid = (float)$payments->where('status','Confirmed')->sum('amount');
        return $this->ok([
            'customer_id'=>$customerId,
            'invoices'=>$invoices,
            'payments'=>$payments,
            'income'=>$income,
            'summary'=>[
                'invoiced'=>$invoiced,
                'paid'=>$paid,
                'outstanding'=>max(0,$invoiced-$paid),
            ],
        ]);
    }

    public function receipt(int $paymentId)
    {
        $payment = Payment::findOrFail($paymentId);
        $invoice = $payment->invoice_id ? Invoice::find($payment->invoice_id) : null;
        return $this->ok(['payment'=>$payment,'invoice'=>$invoice]);
    }
}
