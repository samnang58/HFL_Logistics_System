<?php

namespace Tests\Feature;

use App\Http\Controllers\FinancialClosingController;
use App\Models\CashAccount;
use App\Models\FinancialClosing;
use App\Models\FinancialClosingAudit;
use App\Models\User;
use App\Services\FinancialClosingCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class FinancialClosingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_closing_creates_record_and_audit(): void
    {
        $user = User::create([
            'name' => 'Financial Closing Test User',
            'email' => 'closing-test@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        CashAccount::create([
            'name' => 'Closing Test Cash',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '100.0000',
            'opening_balance_date' => '2026-10-01',
            'is_active' => true,
        ]);

        $request = Request::create('/api/v1/finance/closings', 'POST', [
            'period_type' => 'Daily',
            'period_start' => '2026-10-15',
            'currency' => 'USD',
        ]);

        $request->setUserResolver(fn () => $user);

        $controller = app(FinancialClosingController::class);

        $controller->store(
            $request,
            app(FinancialClosingCalculator::class)
        );

        $closing = FinancialClosing::firstOrFail();
        $audit = FinancialClosingAudit::firstOrFail();

        $this->assertSame('Daily', $closing->period_type);
        $this->assertSame('Closed', $closing->status);
        $this->assertSame('100.0000', $closing->closing_balance);
        $this->assertSame($user->id, $closing->closed_by);

        $this->assertSame($closing->id, $audit->financial_closing_id);
        $this->assertSame('Closed', $audit->action);
        $this->assertSame('Closed', $audit->new_status);
        $this->assertSame($user->id, $audit->performed_by);
    }

    public function test_duplicate_daily_closing_is_rejected(): void
    {
        $user = User::create([
            'name' => 'Duplicate Closing Test',
            'email' => 'duplicate-closing@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        CashAccount::create([
            'name' => 'Duplicate Test Cash',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '100.0000',
            'opening_balance_date' => '2026-10-01',
            'is_active' => true,
        ]);

        $request = Request::create('/api/v1/finance/closings', 'POST', [
            'period_type' => 'Daily',
            'period_start' => '2026-10-15',
            'currency' => 'USD',
        ]);

        $request->setUserResolver(fn () => $user);

        $controller = app(FinancialClosingController::class);
        $calculator = app(FinancialClosingCalculator::class);

        $controller->store($request, $calculator);

        try {
            $controller->store($request, $calculator);
            $this->fail('Duplicate closing should have been rejected.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('period_start', $e->errors());
        }

        $this->assertSame(1, FinancialClosing::count());
        $this->assertSame(1, FinancialClosingAudit::count());
    }


    public function test_user_without_finance_close_permission_cannot_close(): void
    {
        $user = User::create([
            'name' => 'Unauthorized Closing Test',
            'email' => 'unauthorized-closing@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Staff',
            'permissions' => ['finance.view'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/finance/closings', [
                'period_type' => 'Daily',
                'period_start' => '2026-10-15',
                'currency' => 'USD',
            ])
            ->assertForbidden();

        $this->assertSame(0, FinancialClosing::count());
        $this->assertSame(0, FinancialClosingAudit::count());
    }


    public function test_monthly_closing_uses_full_calendar_month(): void
    {
        $user = User::create([
            'name' => 'Monthly Closing Test',
            'email' => 'monthly-closing@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        CashAccount::create([
            'name' => 'Monthly Test Cash',
            'account_type' => 'Cash',
            'currency' => 'USD',
            'opening_balance' => '100.0000',
            'opening_balance_date' => '2026-09-01',
            'is_active' => true,
        ]);

        $request = Request::create('/api/v1/finance/closings', 'POST', [
            'period_type' => 'Monthly',
            'period_start' => '2026-09-01',
            'currency' => 'USD',
        ]);

        $request->setUserResolver(fn () => $user);

        app(FinancialClosingController::class)->store(
            $request,
            app(FinancialClosingCalculator::class)
        );

        $closing = FinancialClosing::firstOrFail();

        $this->assertSame('Monthly', $closing->period_type);
        $this->assertSame('2026-09-01', substr((string) $closing->period_start, 0, 10));
        $this->assertSame('2026-09-30', substr((string) $closing->period_end, 0, 10));
        $this->assertEquals('100.0000', $closing->closing_balance);
        $this->assertSame('Closed', $closing->status);
        $this->assertSame(1, FinancialClosingAudit::count());
    }


    public function test_monthly_closing_rejects_non_first_day(): void
    {
        $user = User::create([
            'name' => 'Monthly Validation Test',
            'email' => 'monthly-validation@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        $request = Request::create('/api/v1/finance/closings', 'POST', [
            'period_type' => 'Monthly',
            'period_start' => '2026-09-02',
            'currency' => 'USD',
        ]);

        $request->setUserResolver(fn () => $user);

        try {
            app(FinancialClosingController::class)->store(
                $request,
                app(FinancialClosingCalculator::class)
            );

            $this->fail('Monthly closing must reject a non-first-day start.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('period_start', $e->errors());
        }

        $this->assertSame(0, FinancialClosing::count());
        $this->assertSame(0, FinancialClosingAudit::count());
    }


    public function test_future_daily_closing_is_rejected(): void
    {
        $user = User::create([
            'name' => 'Future Closing Test',
            'email' => 'future-closing@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        $futureDate = \Carbon\CarbonImmutable::today()
            ->addDays(7)
            ->toDateString();

        $request = Request::create('/api/v1/finance/closings', 'POST', [
            'period_type' => 'Daily',
            'period_start' => $futureDate,
            'currency' => 'USD',
        ]);

        $request->setUserResolver(fn () => $user);

        try {
            app(FinancialClosingController::class)->store(
                $request,
                app(FinancialClosingCalculator::class)
            );

            $this->fail('Future closing must be rejected.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('period_start', $e->errors());
        }

        $this->assertSame(0, FinancialClosing::count());
        $this->assertSame(0, FinancialClosingAudit::count());
    }


    public function test_reopen_closing_updates_status_and_creates_audit(): void
    {
        $user = User::create([
            'name' => 'Reopen Closing Test',
            'email' => 'reopen-closing@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        $closing = FinancialClosing::create([
            'period_type' => 'Daily',
            'period_start' => '2026-09-15',
            'period_end' => '2026-09-15',
            'currency' => 'USD',
            'total_income' => '50.0000',
            'total_expense' => '20.0000',
            'closing_balance' => '130.0000',
            'status' => 'Closed',
            'closed_by' => $user->id,
            'closed_at' => now(),
        ]);

        $request = Request::create(
            '/api/v1/finance/closings/' . $closing->id . '/reopen',
            'POST',
            ['reason' => 'Correction required for recorded transactions']
        );

        $request->setUserResolver(fn () => $user);

        app(FinancialClosingController::class)->reopen($request, $closing);

        $closing->refresh();

        $this->assertSame('Reopened', $closing->status);
        $this->assertSame($user->id, $closing->reopened_by);
        $this->assertNotNull($closing->reopened_at);
        $this->assertSame(
            'Correction required for recorded transactions',
            $closing->reopen_reason
        );

        $this->assertSame(1, FinancialClosingAudit::count());

        $audit = FinancialClosingAudit::firstOrFail();

        $this->assertSame('Reopened', $audit->action);
        $this->assertSame('Closed', $audit->previous_status);
        $this->assertSame('Reopened', $audit->new_status);
        $this->assertSame($user->id, $audit->performed_by);
    }


    public function test_reopening_an_already_reopened_closing_is_rejected(): void
    {
        $user = User::create([
            'name' => 'Duplicate Reopen Test',
            'email' => 'duplicate-reopen@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        $closing = FinancialClosing::create([
            'period_type' => 'Daily',
            'period_start' => '2026-09-15',
            'period_end' => '2026-09-15',
            'currency' => 'USD',
            'total_income' => '50.0000',
            'total_expense' => '20.0000',
            'closing_balance' => '130.0000',
            'status' => 'Closed',
            'closed_by' => $user->id,
            'closed_at' => now(),
        ]);

        $request = Request::create(
            '/api/v1/finance/closings/' . $closing->id . '/reopen',
            'POST',
            ['reason' => 'Correction required for recorded transactions']
        );

        $request->setUserResolver(fn () => $user);

        $controller = app(FinancialClosingController::class);

        $controller->reopen($request, $closing);

        try {
            $controller->reopen($request, $closing);
            $this->fail('Already reopened closing must be rejected.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('status', $e->errors());
        }

        $this->assertSame('Reopened', $closing->fresh()->status);
        $this->assertSame(1, FinancialClosingAudit::count());
    }


    public function test_user_without_finance_reopen_permission_cannot_reopen(): void
    {
        $user = User::create([
            'name' => 'Unauthorized Reopen Test',
            'email' => 'unauthorized-reopen@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Staff',
            'permissions' => ['finance.view'],
            'is_active' => true,
        ]);

        $closing = FinancialClosing::create([
            'period_type' => 'Daily',
            'period_start' => '2026-09-15',
            'period_end' => '2026-09-15',
            'currency' => 'USD',
            'total_income' => '50.0000',
            'total_expense' => '20.0000',
            'closing_balance' => '130.0000',
            'status' => 'Closed',
            'closed_by' => $user->id,
            'closed_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson(
                '/api/v1/finance/closings/' . $closing->id . '/reopen',
                ['reason' => 'Correction required for recorded transactions']
            )
            ->assertForbidden();

        $closing->refresh();

        $this->assertSame('Closed', $closing->status);
        $this->assertNull($closing->reopened_by);
        $this->assertNull($closing->reopened_at);
        $this->assertSame(0, FinancialClosingAudit::count());
    }


    public function test_reopen_requires_a_valid_reason(): void
    {
        $user = User::create([
            'name' => 'Reopen Reason Test',
            'email' => 'reopen-reason@example.test',
            'password' => bcrypt('test-password'),
            'role' => 'Admin',
        ]);

        $closing = FinancialClosing::create([
            'period_type' => 'Daily',
            'period_start' => '2026-09-15',
            'period_end' => '2026-09-15',
            'currency' => 'USD',
            'total_income' => '50.0000',
            'total_expense' => '20.0000',
            'closing_balance' => '130.0000',
            'status' => 'Closed',
            'closed_by' => $user->id,
            'closed_at' => now(),
        ]);

        $request = Request::create(
            '/api/v1/finance/closings/' . $closing->id . '/reopen',
            'POST',
            ['reason' => '']
        );

        $request->setUserResolver(fn () => $user);

        try {
            app(FinancialClosingController::class)->reopen($request, $closing);
            $this->fail('Reopen without a reason must be rejected.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertArrayHasKey('reason', $e->errors());
        }

        $closing->refresh();

        $this->assertSame('Closed', $closing->status);
        $this->assertNull($closing->reopened_at);
        $this->assertSame(0, FinancialClosingAudit::count());
    }

}
