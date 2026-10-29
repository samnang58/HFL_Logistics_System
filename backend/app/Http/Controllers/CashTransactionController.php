<?php

namespace App\Http\Controllers;

use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\FinancialClosing;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashTransactionController extends ApiController
{
    private function validateTransaction(Request $request): array
    {
        return $request->validate([
            'cash_account_id' => 'required|integer|exists:cash_accounts,id',
            'transaction_type' => 'required|in:Income,Expense',
            'amount' => 'required|numeric|gt:0|decimal:0,4|lt:100000000000',
            'currency' => 'required|string|size:3',
            'transaction_at' => 'required|date',
            'description' => 'required|string|max:1000',
            'idempotency_key' => 'required|string|max:100',
        ]);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'cash_account_id' => 'nullable|integer|exists:cash_accounts,id',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = CashTransaction::query()->with('cashAccount');

        if (isset($data['cash_account_id'])) {
            $query->where('cash_account_id', $data['cash_account_id']);
        }

        return $this->ok(
            $query->orderByDesc('transaction_at')
                ->orderByDesc('id')
                ->paginate($data['per_page'] ?? 25)
        );
    }

    public function show($id)
    {
        return $this->ok(
            CashTransaction::with(['cashAccount', 'creator'])
                ->findOrFail($id)
        );
    }

    public function store(Request $request)
    {
        $data = $this->validateTransaction($request);

        $data['currency'] = strtoupper($data['currency']);
        $data['transaction_at'] = Carbon::parse(
            $data['transaction_at']
        )->format('Y-m-d H:i:s');

        try {
            $transaction = DB::transaction(function () use ($data, $request) {
                $account = CashAccount::whereKey($data['cash_account_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $existing = CashTransaction::where(
                    'idempotency_key',
                    $data['idempotency_key']
                )->first();

                if ($existing) {
                    $this->assertSameTransaction($existing, $data);
                    return $existing;
                }

                if (!$account->is_active) {
                    throw ValidationException::withMessages([
                        'cash_account_id' => 'Cash account is inactive.',
                    ]);
                }

                if (strtoupper($account->currency) !== $data['currency']) {
                    throw ValidationException::withMessages([
                        'currency' => 'Currency does not match the cash account.',
                    ]);
                }

                $transactionDate = Carbon::parse(
                    $data['transaction_at']
                )->toDateString();

                $isClosed = FinancialClosing::where('status', 'Closed')
                    ->where('currency', $data['currency'])
                    ->whereDate('period_start', '<=', $transactionDate)
                    ->whereDate('period_end', '>=', $transactionDate)
                    ->exists();

                if ($isClosed) {
                    throw ValidationException::withMessages([
                        'transaction_at' => 'Financial period is closed.',
                    ]);
                }

                // Check available balance before recording an expense.
                if ($data['transaction_type'] === 'Expense') {
                    $balance = (string) $account->opening_balance;

                    $transactions = CashTransaction::where(
                        'cash_account_id',
                        $account->id
                    )->get(['transaction_type', 'amount']);

                    foreach ($transactions as $entry) {
                        if (in_array($entry->transaction_type, [
                            'Income',
                            'Transfer In',
                            'Advance Return',
                        ], true)) {
                            $balance = bcadd(
                                $balance,
                                (string) $entry->amount,
                                4
                            );
                        } elseif (in_array($entry->transaction_type, [
                            'Expense',
                            'Transfer Out',
                            'Advance',
                        ], true)) {
                            $balance = bcsub(
                                $balance,
                                (string) $entry->amount,
                                4
                            );
                        }
                    }

                    if (bccomp(
                        $balance,
                        (string) $data['amount'],
                        4
                    ) < 0) {
                        throw ValidationException::withMessages([
                            'amount' => 'Insufficient cash account balance.',
                        ]);
                    }
                }

                return CashTransaction::create([
                    'cash_account_id' => $account->id,
                    'transaction_type' => $data['transaction_type'],
                    'amount' => $data['amount'],
                    'currency' => $data['currency'],
                    'transaction_at' => $data['transaction_at'],
                    'description' => $data['description'],
                    'idempotency_key' => $data['idempotency_key'],
                    'created_by' => $request->user()->id,
                ]);
            });
        } catch (QueryException $exception) {
            // Database UNIQUE constraint protects against duplicate requests.
            if (!in_array(
                (string) $exception->getCode(),
                ['23000', '23505'],
                true
            )) {
                throw $exception;
            }

            $existing = CashTransaction::where(
                'idempotency_key',
                $data['idempotency_key']
            )->first();

            if (!$existing) {
                throw $exception;
            }

            $this->assertSameTransaction($existing, $data);
            $transaction = $existing;
        }

        return $this->ok(
            $transaction->load('cashAccount'),
            'Cash transaction saved'
        );
    }

    private function assertSameTransaction(
        CashTransaction $existing,
        array $data
    ): void {
        $same =
            (int) $existing->cash_account_id ===
                (int) $data['cash_account_id'] &&
            $existing->transaction_type === $data['transaction_type'] &&
            bccomp(
                (string) $existing->amount,
                (string) $data['amount'],
                4
            ) === 0 &&
            strtoupper($existing->currency) === $data['currency'] &&
            $existing->transaction_at->format('Y-m-d H:i:s') ===
                $data['transaction_at'] &&
            $existing->description === $data['description'];

        if (!$same) {
            throw ValidationException::withMessages([
                'idempotency_key' =>
                    'This key belongs to a different transaction.',
            ]);
        }
    }
}
