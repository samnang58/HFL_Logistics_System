<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TestDataController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'quotations' => DB::table('quotations')
                    ->where('is_test', true)->get(),
                'invoices' => DB::table('invoices')
                    ->where('is_test', true)->get(),
                'payments' => DB::table('payments')
                    ->where('is_test', true)->get(),
                'incomes' => DB::table('incomes')
                    ->where('is_test', true)->get(),
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
            // Strict allowlist: only the reviewed mock invoice.
            if ($id !== 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice is not on the approved test-data allowlist.',
                ], 403);
            }

            $invoice = DB::table('invoices')
                ->where('id', 3)->lockForUpdate()->first();

            if (
                !$invoice ||
                $invoice->invoice_no !== 'HFL-INV-000003' ||
                $invoice->quotation_id != 1 ||
                $invoice->customer_id !== 'HFL-PKG-000005' ||
                $invoice->customer_name !== 'bb' ||
                (float) $invoice->grand_total !== 203.0 ||
                (float) $invoice->paid_amount !== 203.0 ||
                (float) $invoice->outstanding !== 0.0 ||
                $invoice->status !== 'Paid'
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice verification failed. No records changed.',
                ], 409);
            }

            if ($invoice->is_test) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice is already marked as test data.',
                ], 409);
            }

            // Confirm the linked quotation matches the reviewed test record.
            $quotation = DB::table('quotations')
                ->where('id', 1)->lockForUpdate()->first();

            if (
                !$quotation ||
                $quotation->quotation_no !== 'HFL-QTN-000001' ||
                $quotation->customer_id !== 'HFL-PKG-000005' ||
                $quotation->customer_name !== 'bb' ||
                $quotation->status !== 'Accepted' ||
                (float) $quotation->grand_total !== 203.0 ||
                $quotation->is_test
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quotation verification failed. No records changed.',
                ], 409);
            }

            // Never mark a quotation shared by another invoice.
            if (DB::table('invoices')
                ->where('quotation_id', 1)
                ->where('id', '!=', 3)
                ->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Quotation is linked to another invoice.',
                ], 409);
            }

            $payments = DB::table('payments')
                ->where('invoice_id', '3')
                ->lockForUpdate()->get();

            if (
                $payments->count() !== 1 ||
                (int) $payments[0]->id !== 2 ||
                $payments[0]->payment_no !== 'HFL-PAY-000002' ||
                $payments[0]->customer_id !== 'HFL-PKG-000005' ||
                (float) $payments[0]->amount !== 203.0 ||
                (float) $payments[0]->applied_amount !== 0.0 ||
                (float) $payments[0]->credit_amount !== 0.0 ||
                $payments[0]->overpayment_action !== null ||
                (float) $payments[0]->overpayment_handled_amount !== 0.0 ||
                $payments[0]->overpayment_target_invoice_id !== null ||
                $payments[0]->status !== 'Confirmed' ||
                $payments[0]->delivery_id !== null ||
                $payments[0]->settlement_id !== null ||
                $payments[0]->is_test
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed. No records changed.',
                ], 409);
            }

            $payment = $payments[0];

            // Check both invoice-linked and payment-linked income records.
            $incomes = DB::table('incomes')
                ->where(function ($query) {
                    $query->where('invoice_id', '3')
                        ->orWhere('payment_id', '2');
                })
                ->lockForUpdate()->get();

            if (
                $incomes->count() !== 1 ||
                (int) $incomes[0]->id !== 2 ||
                $incomes[0]->income_no !== 'HFL-INC-000002' ||
                (string) $incomes[0]->invoice_id !== '3' ||
                (string) $incomes[0]->payment_id !== '2' ||
                $incomes[0]->customer_id !== 'HFL-PKG-000005' ||
                (float) $incomes[0]->amount !== 203.0 ||
                $incomes[0]->status !== 'Confirmed' ||
                $incomes[0]->is_test
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Income verification failed. No records changed.',
                ], 409);
            }

            // Stop if dependent financial records exist.
            if (Schema::hasTable('customer_credits')
                && DB::table('customer_credits')
                    ->where('source_payment_id', 2)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment has linked customer credits.',
                ], 409);
            }

            if (Schema::hasTable('billing_revisions')
                && DB::table('billing_revisions')
                    ->where('invoice_id', 3)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invoice has billing revisions.',
                ], 409);
            }

            if (Schema::hasTable('payment_overpayment_actions')
                && DB::table('payment_overpayment_actions')
                    ->where(function ($query) {
                        $query->where('invoice_id', 3)
                            ->orWhere('payment_id', 2)
                            ->orWhere('target_invoice_id', 3);
                    })->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment has linked overpayment actions.',
                ], 409);
            }

            // Update ONLY is_test. Never change amounts or statuses.
            DB::table('invoices')->where('id', 3)
                ->update(['is_test' => true]);

            DB::table('quotations')->where('id', 1)
                ->update(['is_test' => true]);

            DB::table('payments')->where('id', 2)
                ->update(['is_test' => true]);

            DB::table('incomes')->where('id', 2)
                ->update(['is_test' => true]);

            AuditLog::create([
                'user_id' => $request->user()?->id,
                'user_name' => $request->user()?->name ?? 'System',
                'action' => 'MARK TEST DATA',
                'method' => 'POST',
                'route' => $request->path(),
                'entity_type' => 'invoice',
                'entity_id' => '3',
                'status' => 'success',
                'response_code' => 200,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 1000),
                'metadata' => [
                    'reason' => $validated['reason'],
                    'invoice_id' => 3,
                    'quotation_id' => 1,
                    'payment_ids' => [2],
                    'income_ids' => [2],
                    'is_test' => true,
                    'amounts_and_statuses_changed' => false,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Verified test records marked. Amounts and statuses were preserved.',
                'data' => [
                    'invoice_id' => 3,
                    'quotation_id' => 1,
                    'payment_ids' => [2],
                    'income_ids' => [2],
                    'is_test' => true,
                ],
            ]);
        });
    }
}
