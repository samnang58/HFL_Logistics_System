<?php

namespace App\Http\Controllers;

use App\Models\CashAccount;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashAccountController extends ApiController
{
    public function index(Request $request)
    {
        $accounts = CashAccount::query()
            ->orderBy('name')
            ->get();

        return $this->ok($accounts);
    }

    public function show($id)
    {
        return $this->ok(CashAccount::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'account_type' => [
                'required',
                Rule::in(['Cash', 'Bank']),
            ],
            'currency' => 'required|string|size:3',
            'opening_balance' => 'required|numeric|min:0',
        ]);

        $data['currency'] = strtoupper($data['currency']);
        $data['is_active'] = true;

        $account = CashAccount::create($data);

        return $this->ok($account, 'Cash account created');
    }
}