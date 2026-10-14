<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Income;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quotation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TestDataController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'quotations' => Quotation::where('is_test', true)
                    ->get(['id', 'quotation_no', 'customer_id', 'status', 'grand_total', 'is_test']),
                'invoices' => Invoice::where('is_test', true)
                    ->get(['id', 'invoice_no', 'quotation_id', 'customer_id', 'status', 'grand_total', 'paid_amount', 'outstanding', 'is_test']),
                'payments' => Payment::where('is_test', true)
                    ->get(['id', 'payment_no', 'invoice_id', 'customer_id', 'amount', 'status', 'is_test']),
                'incomes' => Income::where('is_test', true)
                    ->get(['id', 'income_no', 'payment_id', 'invoice_id', 'customer_id', 'amount', 'status', 'is_test']),
            ],
        ]);
    }

    public function markInvoice(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'confirm' => ['required', 'accepted'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        return DB::transaction(function () use ($request, $id, $validated) {
            $invoice = Invoice::whereKey($id)->lockForUpdate()->first();

            if (!$invoice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice not found.',
                ], 404);
            }

            $payments = Payment::where('invoice_id', (string) $invoice->id)
                ->lockForUpdate()
                ->get();

            $paymentIds = $payments->pluck('id')->all();

            $incomes = Income::where(function ($query) use ($invoice, $paymentIds) {
                $query->where('invoice_id', (string) $invoice->id);

                if (!empty($paymentIds)) {
                    $query->orWhereIn('payment_id', array_map('strval', $paymentIds));
                }
            })->lockForUpdate()->get();

            $quotation = null;

            if ($invoice->quotation_id) {
                $quotation = Quotation::whereKey($invoice->quotation_id)
                    ->lockForUpdate()
                    ->first();

                $otherInvoiceExists = Invoice::where('quotation_id', $invoice->quotation_id)
                    ->where('id', '!=', $invoice->id)
                    ->exists();

                if ($otherInvoiceExists && $quotation && !$quotation->is_test) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Quotation is shared with another invoice; mark it separately after review.',
                    ], 409);
                }
            }

            $invoice->is_test = true;
            $invoice->save();

            foreach ($payments as $payment) {
                $payment->is_test = true;
                $payment->save();
            }

            foreach ($incomes as $income) {
                $income->is_test = true;
                $income->save();
            }

            if ($quotation) {
                $quotation->is_test = true;
                $quotation->save();
            }

            AuditLog::create([
                'user_id' => $request->user()?->id,
                'user_name' => $request->user()?->name ?? 'System',
                'action' => 'MARK TEST DATA',
                'method' => 'POST',
                'route' => $request->path(),
                'entity_type' => 'invoice',
                'entity_id' => (string) $invoice->id,
                'status' => 'success',
                'response_code' => 200,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 1000),
                'metadata' => [
                    'reason' => $validated['reason'],
                    'invoice_id' => $invoice->id,
                    'quotation_id' => $quotation?->id,
                    'payment_ids' => $paymentIds,
                    'income_ids' => $incomes->pluck('id')->all(),
                    'is_test' => true,
                    'amounts_and_statuses_changed' => false,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Invoice and related financial records marked as test data.',
                'data' => [
                    'invoice_id' => $invoice->id,
                    'quotation_id' => $quotation?->id,
                    'payment_ids' => $paymentIds,
                    'income_ids' => $incomes->pluck('id')->all(),
                    'is_test' => true,
                ],
            ]);
        });
    }
}

