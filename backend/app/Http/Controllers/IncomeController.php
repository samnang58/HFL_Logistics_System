<?php

namespace App\Http\Controllers;

use App\Models\Income;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IncomeController extends CrudController
{
    protected string $model = Income::class;

    protected array $rules = [
        'customer_id' => 'nullable|string|max:100',
        'amount' => 'required|numeric|gt:0',
        'category' => 'required|string|max:100',
        'description' => 'nullable|string|max:1000',
        'received_at' => 'required|date',
    ];

    protected function searchColumns(): array
    {
        return ['income_no', 'customer_id', 'category', 'description'];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);

        // Prevent manually linking Income to an existing Payment.
        if ($request->exists('payment_id')) {
            return $this->fail(
                'Payment-linked income must be created through the payment process.',
                ['payment_id' => ['Manual payment linking is not allowed.']],
                422
            );
        }

        // Prevent manually linking Income to an existing Invoice.
        if ($request->exists('invoice_id')) {
            return $this->fail(
                'Invoice-linked income must be created through the payment process.',
                ['invoice_id' => ['Manual invoice linking is not allowed.']],
                422
            );
        }

        return DB::transaction(function () use ($data) {
            $income = Income::create(array_merge($data, [
                'income_no' => 'TMP-INC-' . Str::uuid(),
            ]));

            $income->income_no = 'HFL-INC-' .
                str_pad((string) $income->id, 6, '0', STR_PAD_LEFT);

            $income->save();

            return $this->ok($income, 'Income recorded');
        });
    }
}