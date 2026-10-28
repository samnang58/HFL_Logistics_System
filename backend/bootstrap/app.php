
<?php

date_default_timezone_set('Asia/Phnom_Penh');

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\AuditMutations;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\EnsureActiveUser;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up'
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(AuditMutations::class);

        $middleware->alias([
            'permission' => EnsurePermission::class,
            'super-admin' => EnsureSuperAdmin::class,
            'active-staff' => EnsureActiveUser::class,
        ]);

        $middleware->redirectGuestsTo(function ($request) {
            if ($request->is('api/*')) {
                return null;
            }

            return route('login');
        });

        // HFL uses Sanctum personal access tokens (Bearer tokens).
        // Do not enable stateful cookie authentication / CSRF for the API.
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('china:sync')
            ->hourly()
            ->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function ($request, $input) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })
    ->create();
