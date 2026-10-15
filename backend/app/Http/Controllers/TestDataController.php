<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class TestDataController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'customers' => DB::table('customers')
                    ->where('customer_id', 'like', 'HFLTEST%')
                    ->orderBy('id')->get(),
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
}
