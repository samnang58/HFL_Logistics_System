<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\CashTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FinancialClosingCalculator
{
    public function calculate(
        string $periodStart,
        string $periodEnd,
        string $currency
    ): array {
        $start = Carbon::parse($periodStart)->startOfDay();
        $end = Carbon::parse($periodEnd)->endOfDay();
        $currency = strtoupper($currency);

        if ($start->greaterThan($end)) {
            throw new InvalidArgumentException('Invalid closing period.');
        }

        if (!in_array($currency, ['USD', 'KHR'], true)) {
            throw new InvalidArgumentException('Unsupported currency.');
        }

        $accounts = CashAccount::query()
            ->where('currency', $currency)
            ->get(['id', 'opening_balance', 'opening_balance_date']);

        $openingBalance = '0.0000';

        foreach ($accounts as $account) {
            if ($account->opening_balance_date === null) {
                throw new InvalidArgumentException(
                    'Cash account '.$account->id.
                    ' has no opening balance date.'
                );
            }

            if (Carbon::parse($account->opening_balance_date)
                ->startOfDay()
                ->lessThanOrEqualTo($end)) {
                $openingBalance = bcadd(
                    $openingBalance,
                    (string) $account->opening_balance,
                    4
                );
            }
        }

        $invalidTransactions = CashTransaction::query()
            ->join(
                'cash_accounts',
                'cash_transactions.cash_account_id',
                '=',
                'cash_accounts.id'
            )
            ->where('cash_transactions.currency', $currency)
            ->whereNotNull('cash_accounts.opening_balance_date')
            ->whereRaw(
                'DATE(cash_transactions.transaction_at) < cash_accounts.opening_balance_date'
            )
            ->exists();

        if ($invalidTransactions) {
            throw new InvalidArgumentException(
                'Transactions exist before an account opening balance date.'
            );
        }

        $supportedTypes = [
            'Income',
            'Expense',
            'Transfer In',
            'Transfer Out',
            'Advance',
            'Advance Return',
        ];

        $unknownType = CashTransaction::query()
            ->where('currency', $currency)
            ->where('transaction_at', '<=', $end->format('Y-m-d H:i:s'))
            ->whereNotIn('transaction_type', $supportedTypes)
            ->value('transaction_type');

        if ($unknownType !== null) {
            throw new InvalidArgumentException(
                'Unsupported cash transaction type: '.$unknownType
            );
        }

        $currencyMismatch = CashTransaction::query()
            ->join(
                'cash_accounts',
                'cash_transactions.cash_account_id',
                '=',
                'cash_accounts.id'
            )
            ->where('cash_transactions.transaction_at', '<=', $end->format('Y-m-d H:i:s'))
            ->whereColumn(
                'cash_transactions.currency',
                '!=',
                'cash_accounts.currency'
            )
            ->exists();

        if ($currencyMismatch) {
            throw new InvalidArgumentException(
                'Cash transaction currency does not match its account.'
            );
        }

        $amounts = CashTransaction::query()
            ->where('currency', $currency)
            ->where('transaction_at', '<=', $end->format('Y-m-d H:i:s'))
            ->select(
                'transaction_type',
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('transaction_type')
            ->get()
            ->pluck('total', 'transaction_type');

        $incomeTypes = ['Income', 'Transfer In', 'Advance Return'];
        $expenseTypes = ['Expense', 'Transfer Out', 'Advance'];

        $closingBalance = $openingBalance;

        foreach ($incomeTypes as $type) {
            $closingBalance = bcadd(
                $closingBalance,
                (string) ($amounts[$type] ?? '0'),
                4
            );
        }

        foreach ($expenseTypes as $type) {
            $closingBalance = bcsub(
                $closingBalance,
                (string) ($amounts[$type] ?? '0'),
                4
            );
        }

        $periodAmounts = CashTransaction::query()
            ->where('currency', $currency)
            ->whereBetween('transaction_at', [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ])
            ->whereIn('transaction_type', ['Income', 'Expense'])
            ->select(
                'transaction_type',
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('transaction_type')
            ->get()
            ->pluck('total', 'transaction_type');

        return [
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'currency' => $currency,
            'total_income' => bcadd(
                '0',
                (string) ($periodAmounts['Income'] ?? '0'),
                4
            ),
            'total_expense' => bcadd(
                '0',
                (string) ($periodAmounts['Expense'] ?? '0'),
                4
            ),
            'closing_balance' => $closingBalance,
        ];
    }
}
