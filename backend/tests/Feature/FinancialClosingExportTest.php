<?php

namespace Tests\Feature;

use App\Http\Controllers\FinancialClosingController;
use App\Models\FinancialClosing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class FinancialClosingExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_generates_valid_xlsx_with_financial_data(): void
    {
        $user = User::create([
            'name' => 'Finance Export Tester',
            'email' => 'finance-export@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        FinancialClosing::create([
            'period_type' => 'Daily',
            'period_start' => '2026-09-15',
            'period_end' => '2026-09-15',
            'currency' => 'USD',
            'total_income' => '150.2500',
            'total_expense' => '50.1250',
            'closing_balance' => '1100.1250',
            'status' => 'Closed',
            'closed_by' => $user->id,
            'closed_at' => now(),
        ]);

        $request = Request::create('/api/v1/finance/closings/export', 'GET', [
            'currency' => 'USD',
        ]);

        $response = app(FinancialClosingController::class)->export($request);

        $this->assertStringContainsString(
            '.xlsx',
            $response->headers->get('content-disposition')
        );

        ob_start();
        $response->sendContent();
        $content = ob_get_clean();

        $this->assertNotEmpty($content);

        $path = tempnam(sys_get_temp_dir(), 'closing-export-');

        try {
            file_put_contents($path, $content);

            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();

            $this->assertSame('Period Type', $sheet->getCell('B1')->getValue());
            $this->assertSame('Daily', $sheet->getCell('B2')->getValue());
            $this->assertSame('USD', $sheet->getCell('E2')->getValue());
            $this->assertSame('150.25', $sheet->getCell('F2')->getValue());
            $this->assertSame('50.125', $sheet->getCell('G2')->getValue());
            $this->assertSame('1100.125', $sheet->getCell('H2')->getValue());
            $this->assertSame('Finance Export Tester', $sheet->getCell('J2')->getValue());

            $spreadsheet->disconnectWorksheets();
        } finally {
            @unlink($path);
        }
    }

    public function test_user_without_finance_view_cannot_export(): void
    {
        $user = User::create([
            'name' => 'Unauthorized Export Tester',
            'email' => 'unauthorized-export@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Staff',
            'permissions' => [],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->get('/api/v1/finance/closings/export')
            ->assertForbidden();
    }


    public function test_export_currency_filter_excludes_other_currencies(): void
    {
        $user = User::create([
            'name' => 'Currency Filter Tester',
            'email' => 'currency-filter@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        foreach (['USD', 'KHR'] as $currency) {
            FinancialClosing::create([
                'period_type' => 'Daily',
                'period_start' => '2026-09-16',
                'period_end' => '2026-09-16',
                'currency' => $currency,
                'total_income' => '100.0000',
                'total_expense' => '20.0000',
                'closing_balance' => '80.0000',
                'status' => 'Closed',
                'closed_by' => $user->id,
                'closed_at' => now(),
            ]);
        }

        $request = Request::create(
            '/api/v1/finance/closings/export',
            'GET',
            ['currency' => 'USD']
        );

        $response = app(FinancialClosingController::class)->export($request);

        ob_start();
        $response->sendContent();
        $content = ob_get_clean();

        $path = tempnam(sys_get_temp_dir(), 'closing-filter-');

        try {
            file_put_contents($path, $content);

            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();

            $this->assertSame('USD', $sheet->getCell('E2')->getValue());
            $this->assertNull($sheet->getCell('E3')->getValue());

            $spreadsheet->disconnectWorksheets();
        } finally {
            @unlink($path);
        }
    }


    public function test_export_rejects_more_than_5000_records(): void
    {
        $user = User::create([
            'name' => 'Export Limit Tester',
            'email' => 'export-limit@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Staff',
            'permissions' => ['finance.view'],
            'is_active' => true,
        ]);

        $rows = [];
        $now = now();

        for ($i = 0; $i < 5001; $i++) {
            $date = \Carbon\CarbonImmutable::parse('2010-01-01')
                ->addDays($i)
                ->toDateString();

            $rows[] = [
                'period_type' => 'Daily',
                'period_start' => $date,
                'period_end' => $date,
                'currency' => 'USD',
                'total_income' => '100.0000',
                'total_expense' => '20.0000',
                'closing_balance' => '80.0000',
                'status' => 'Closed',
                'closed_by' => $user->id,
                'closed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($rows) === 200) {
                \Illuminate\Support\Facades\DB::table('financial_closings')
                    ->insert($rows);
                $rows = [];
            }
        }

        if ($rows !== []) {
            \Illuminate\Support\Facades\DB::table('financial_closings')
                ->insert($rows);
        }

        $this->assertSame(5001, FinancialClosing::count());

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/finance/closings/export?currency=USD')
            ->assertStatus(422)
            ->assertJsonValidationErrors('export');
    }

}
