<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Services\FinancialClosingCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialClosingCalculatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_daily_cash_closing(): void
    {
        $account = CashAccount::create([
            'name' => 'Test Cash USD',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '100.0000',
            'opening_balance_date' => '2026-10-01',
            'is_active' => true,
        ]);

        foreach ([
            ['Income', '50.0000'],
            ['Expense', '20.0000'],
        ] as [$type, $amount]) {
            CashTransaction::create([
                'cash_account_id' => $account->id,
                'transaction_type' => $type,
                'amount' => $amount,
                'currency' => 'USD',
                'transaction_at' => '2026-10-15 12:00:00',
                'description' => 'Automated test',
            ]);
        }

        $result = app(FinancialClosingCalculator::class)
            ->calculate('2026-10-15', '2026-10-15', 'USD');

        $this->assertSame('50.0000', $result['total_income']);
        $this->assertSame('20.0000', $result['total_expense']);
        $this->assertSame('130.0000', $result['closing_balance']);
    }

    public function test_it_excludes_accounts_opened_after_closing_date(): void
    {
        CashAccount::create([
            'name' => 'Future Cash Account',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '500.0000',
            'opening_balance_date' => '2026-11-01',
            'is_active' => true,
        ]);

        $result = app(FinancialClosingCalculator::class)
            ->calculate('2026-10-15', '2026-10-15', 'USD');

        $this->assertSame('0.0000', $result['total_income']);
        $this->assertSame('0.0000', $result['total_expense']);
        $this->assertSame('0.0000', $result['closing_balance']);
    }


    public function test_it_keeps_usd_and_khr_balances_separate(): void
    {
        foreach ([
            ['USD', '100.0000', '25.0000'],
            ['KHR', '400000.0000', '50000.0000'],
        ] as [$currency, $opening, $income]) {
            $account = CashAccount::create([
                'name' => 'Test Cash ' . $currency,
                'account_type' => 'Cash',
                'currency' => $currency,
                'opening_balance' => $opening,
                'opening_balance_date' => '2026-10-01',
                'is_active' => true,
            ]);

            CashTransaction::create([
                'cash_account_id' => $account->id,
                'transaction_type' => 'Income',
                'amount' => $income,
                'currency' => $currency,
                'transaction_at' => '2026-10-15 12:00:00',
            ]);
        }

        $calculator = app(FinancialClosingCalculator::class);

        $usd = $calculator->calculate('2026-10-15', '2026-10-15', 'USD');
        $khr = $calculator->calculate('2026-10-15', '2026-10-15', 'KHR');

        $this->assertSame('25.0000', $usd['total_income']);
        $this->assertSame('125.0000', $usd['closing_balance']);
        $this->assertSame('50000.0000', $khr['total_income']);
        $this->assertSame('450000.0000', $khr['closing_balance']);
    }

}
