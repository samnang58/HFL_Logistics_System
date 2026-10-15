<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestDataSeeder extends Seeder
{
    public function run(): void
    {
        $customerId = 'HFLTEST00001';

        // Stop safely if any identifier from this dataset already exists.
        // Never overwrite or repair partial datasets automatically.
        $identifierChecks = [
            'customer' => DB::table('customers')
                ->where('customer_id', $customerId)->exists(),
            'quotation' => DB::table('quotations')
                ->where('quotation_no', 'HFL-TST-QTN-00001')->exists(),
            'invoice' => DB::table('invoices')
                ->where('invoice_no', 'HFL-TST-INV-00001')->exists(),
            'payment' => DB::table('payments')
                ->where('payment_no', 'HFL-TST-PAY-00001')->exists(),
            'receipt' => DB::table('payments')
                ->where('receipt_no', 'HFL-TST-RCP-00001')->exists(),
            'income' => DB::table('incomes')
                ->where('income_no', 'HFL-TST-INC-00001')->exists(),
        ];

        if (in_array(true, $identifierChecks, true)) {
            $this->command?->error(
                'At least one test identifier already exists. No records were inserted.'
            );

            return;
        }

        DB::transaction(function () use ($customerId) {
            $now = now();
            $items = json_encode([
                [
                    'description' => 'Test shipping service',
                    'quantity' => 1,
                    'unit_price' => 100,
                    'amount' => 100,
                ],
            ], JSON_THROW_ON_ERROR);

            DB::table('customers')->insert([
                'customer_id' => $customerId,
                'username' => 'hfl_test_customer_001',
                'full_name' => 'HFL Test Customer 001',
                'company_name' => 'HFL Test Data',
                'email' => 'hfl-test-customer-001@example.invalid',
                'customer_group' => 'TEST',
                'status' => 'Active',
                'registration_date' => $now->toDateString(),
                'notes' => '[TEST DATA] Created by TestDataSeeder',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $quotationId = DB::table('quotations')->insertGetId([
                'quotation_no' => 'HFL-TST-QTN-00001',
                'customer_id' => $customerId,
                'customer_name' => 'HFL Test Customer 001',
                'status' => 'Accepted',
                'items' => $items,
                'subtotal' => 100,
                'discount' => 0,
                'tax' => 0,
                'grand_total' => 100,
                'valid_until' => $now->copy()->addDays(30)->toDateString(),
                'is_test' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $invoiceId = DB::table('invoices')->insertGetId([
                'invoice_no' => 'HFL-TST-INV-00001',
                'quotation_id' => $quotationId,
                'customer_id' => $customerId,
                'customer_name' => 'HFL Test Customer 001',
                'status' => 'Paid',
                'items' => $items,
                'subtotal' => 100,
                'discount' => 0,
                'tax' => 0,
                'grand_total' => 100,
                'paid_amount' => 100,
                'outstanding' => 0,
                'due_date' => $now->copy()->addDays(30)->toDateString(),
                'is_test' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $paymentId = DB::table('payments')->insertGetId([
                'payment_no' => 'HFL-TST-PAY-00001',
                'receipt_no' => 'HFL-TST-RCP-00001',
                'invoice_id' => $invoiceId,
                'customer_id' => $customerId,
                'amount' => 100,
                'applied_amount' => 100,
                'credit_amount' => 0,
                'method' => 'Cash',
                'reference' => 'HFL-TEST-SEED-001',
                'status' => 'Confirmed',
                'paid_at' => $now,
                'is_test' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('incomes')->insert([
                'income_no' => 'HFL-TST-INC-00001',
                'payment_id' => $paymentId,
                'customer_id' => $customerId,
                'invoice_id' => $invoiceId,
                'amount' => 100,
                'category' => 'Shipping',
                'status' => 'Confirmed',
                'description' => '[TEST DATA] Test shipping payment',
                'received_at' => $now,
                'is_test' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        $this->command?->info(
            'Test dataset prepared: 1 customer, 1 quotation, ' .
            '1 invoice, 1 payment and 1 income.'
        );
    }
}
