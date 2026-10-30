<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CashTransactionValidationTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): void
    {
        $user = User::create([
            'name' => 'Cash Validation Test Admin',
            'email' => 'cash-validation-admin@example.com',
            'password' => bcrypt('test-password-123'),
            'role' => 'Super Admin',
            'permissions' => ['*'],
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);
    }

    private function makeAccount(): CashAccount
    {
        return CashAccount::create([
            'name' => 'Cash Validation Test Account',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '100.0000',
            'is_active' => true,
        ]);
    }

    private function validPayload(CashAccount $account): array
    {
        return [
            'cash_account_id' => $account->id,
            'transaction_type' => 'Income',
            'amount' => '10.0000',
            'currency' => 'USD',
            'transaction_at' => '2026-10-30 10:00:00',
            'description' => 'Cash validation test',
            'idempotency_key' => 'cash-validation-test-001',
        ];
    }

    public function test_zero_amount_is_rejected(): void
    {
        $this->makeAdmin();
        $account = $this->makeAccount();

        $payload = $this->validPayload($account);
        $payload['amount'] = '0';

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_negative_amount_is_rejected(): void
    {
        $this->makeAdmin();
        $account = $this->makeAccount();

        $payload = $this->validPayload($account);
        $payload['amount'] = '-5.0000';

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_invalid_transaction_type_is_rejected(): void
    {
        $this->makeAdmin();
        $account = $this->makeAccount();

        $payload = $this->validPayload($account);
        $payload['transaction_type'] = 'Unknown';

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['transaction_type']);

        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_more_than_four_decimal_places_is_rejected(): void
    {
        $this->makeAdmin();
        $account = $this->makeAccount();

        $payload = $this->validPayload($account);
        $payload['amount'] = '1.12345';

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_nonexistent_cash_account_is_rejected(): void
    {
        $this->makeAdmin();

        $payload = [
            'cash_account_id' => 999999,
            'transaction_type' => 'Income',
            'amount' => '10.0000',
            'currency' => 'USD',
            'transaction_at' => '2026-10-30 10:00:00',
            'description' => 'Invalid account test',
            'idempotency_key' => 'cash-validation-invalid-account',
        ];

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cash_account_id']);

        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_expense_exceeding_balance_is_rejected(): void
    {
        $this->makeAdmin();
        $account = $this->makeAccount();

        // Opening balance = 100.0000 USD.
        // Requested expense = 150.0000 USD.
        $payload = $this->validPayload($account);
        $payload['transaction_type'] = 'Expense';
        $payload['amount'] = '150.0000';
        $payload['idempotency_key'] =
            'cash-validation-insufficient-balance';

        $this->postJson('/api/v1/cash/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['amount']);

        // Rejected expense must not create a transaction.
        $this->assertDatabaseCount('cash_transactions', 0);
    }
}
