<?php

namespace App\Http\Controllers;

use App\Models\CashAccount;
use App\Models\FinancialClosing;
use App\Services\FinancialClosingCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;

class FinancialClosingController extends ApiController
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'period_type' => 'nullable|in:Daily,Monthly',
            'currency' => 'nullable|in:USD,KHR',
            'status' => 'nullable|in:Closed,Reopened',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = FinancialClosing::query()
            ->with(['closer', 'reopener', 'audits.performer']);

        foreach (['period_type', 'currency', 'status'] as $field) {
            if (isset($data[$field])) {
                $query->where($field, $data[$field]);
            }
        }

        return $this->ok(
            $query->orderByDesc('period_end')
                ->orderByDesc('id')
                ->paginate($data['per_page'] ?? 25)
        );
    }

    public function store(Request $request, FinancialClosingCalculator $calculator)
    {
        $data = $request->validate([
            'period_type' => 'required|in:Daily,Monthly',
            'period_start' => 'required|date_format:Y-m-d',
            'currency' => 'required|in:USD,KHR',
        ]);

        $start = CarbonImmutable::createFromFormat('!Y-m-d', $data['period_start']);
        $end = $data['period_type'] === 'Daily'
            ? $start
            : $start->endOfMonth();

        if ($data['period_type'] === 'Monthly' && !$start->isStartOfMonth()) {
            throw ValidationException::withMessages([
                'period_start' => 'Monthly closing must start on the first day of a month.',
            ]);
        }

        if ($end->isAfter(CarbonImmutable::today())) {
            throw ValidationException::withMessages([
                'period_start' => 'Cannot close a future period.',
            ]);
        }

        $result = DB::transaction(function () use ($request, $data, $start, $end, $calculator) {
            $startDate = $start->toDateString();
            $endDate = $end->toDateString();

            $existing = FinancialClosing::query()
                ->where('period_type', $data['period_type'])
                ->whereDate('period_start', $startDate)
                ->whereDate('period_end', $endDate)
                ->where('currency', $data['currency'])
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'period_start' => 'This closing period already exists.',
                ]);
            }

            // Serialize closing with cash writes that lock the same accounts.
            CashAccount::query()
                ->where('currency', $data['currency'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id']);

            $totals = $calculator->calculate(
                $startDate,
                $endDate,
                $data['currency']
            );

            $closing = FinancialClosing::create([
                'period_type' => $data['period_type'],
                'period_start' => $startDate,
                'period_end' => $endDate,
                'currency' => $data['currency'],
                'total_income' => $totals['total_income'],
                'total_expense' => $totals['total_expense'],
                'closing_balance' => $totals['closing_balance'],
                'status' => 'Closed',
                'closed_by' => $request->user()->id,
                'closed_at' => now(),
            ]);

            $closing->audits()->create([
                'action' => 'Closed',
                'performed_by' => $request->user()->id,
                'performed_at' => now(),
                'previous_status' => null,
                'new_status' => 'Closed',
                'details' => $totals,
            ]);

            return $closing->load(['closer', 'audits']);
        });

        return $this->ok($result);
    }


    public function reopen(Request $request, FinancialClosing $closing)
    {
        $data = $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $result = DB::transaction(function () use ($request, $closing, $data) {
            $locked = FinancialClosing::query()
                ->whereKey($closing->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'Closed') {
                throw ValidationException::withMessages([
                    'status' => 'Only a closed financial period can be reopened.',
                ]);
            }

            $locked->update([
                'status' => 'Reopened',
                'reopened_by' => $request->user()->id,
                'reopened_at' => now(),
                'reopen_reason' => $data['reason'],
            ]);

            $locked->audits()->create([
                'action' => 'Reopened',
                'performed_by' => $request->user()->id,
                'performed_at' => now(),
                'reason' => $data['reason'],
                'previous_status' => 'Closed',
                'new_status' => 'Reopened',
                'details' => [
                    'period_type' => $locked->period_type,
                    'period_start' => $locked->period_start->toDateString(),
                    'period_end' => $locked->period_end->toDateString(),
                    'currency' => $locked->currency,
                ],
            ]);

            return $locked->load(['closer', 'reopener', 'audits']);
        });

        return $this->ok($result);
    }


    public function export(Request $request)
    {
        $data = $request->validate([
            'period_type' => 'nullable|in:Daily,Monthly',
            'currency' => 'nullable|in:USD,KHR',
            'status' => 'nullable|in:Closed,Reopened',
        ]);

        $query = FinancialClosing::query()->with('closer');

        foreach (['period_type', 'currency', 'status'] as $field) {
            if (isset($data[$field])) {
                $query->where($field, $data[$field]);
            }
        }

        if ((clone $query)->count() > 5000) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'export' => 'Export is limited to 5,000 closing records. Please narrow the filters.',
            ]);
        }

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Financial Closings');

        $headers = [
            'ID', 'Period Type', 'Start Date', 'End Date',
            'Currency', 'Total Income', 'Total Expense',
            'Closing Balance', 'Status', 'Closed By', 'Closed At',
        ];

        $sheet->fromArray($headers, null, 'A1');

        $row = 2;

        foreach ($query->orderByDesc('period_end')->orderByDesc('id')->lazy(500) as $closing) {
            $values = [
                $closing->id,
                $closing->period_type,
                $closing->period_start->toDateString(),
                $closing->period_end->toDateString(),
                $closing->currency,
                (float) $closing->total_income,
                (float) $closing->total_expense,
                (float) $closing->closing_balance,
                $closing->status,
                $closing->closer?->name ?? '',
                $closing->closed_at?->format('Y-m-d H:i:s') ?? '',
            ];

            foreach ($values as $index => $value) {
                $sheet->setCellValueExplicit(
                    [$index + 1, $row],
                    (string) $value,
                    \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING
                );
            }

            $row++;
        }

        $sheet->getStyle('A1:K1')->getFont()->setBold(true);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:K' . max(1, $row - 1));

        foreach (range('A', 'K') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $filename = 'financial-closings-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

}
