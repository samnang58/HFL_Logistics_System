<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Telegram\TelegramWebhookController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\CustomerShipmentController;
use App\Http\Controllers\CustomerWarehouseController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\ShippingModeController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\ContainerController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\IncomeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\CashAccountController;
use App\Http\Controllers\CashTransactionController;
use App\Http\Controllers\FinancialClosingController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ChinaSyncController;
use App\Http\Controllers\CambodiaWarehouseController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\BillingSettingsController;
use App\Http\Controllers\MockChinaApiController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TestDataController;

Route::prefix('v1')->group(function () {

    Route::post('/telegram/webhook', TelegramWebhookController::class)
        ->middleware('throttle:60,1');

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/customer/login', [CustomerAuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/customer/me', [CustomerAuthController::class, 'me']);
        Route::post('/customer/profile/avatar', [CustomerAuthController::class, 'uploadAvatar']);
        Route::post('/customer/logout', [CustomerAuthController::class, 'logout']);

        Route::get('/customer/shipments/counts', [CustomerShipmentController::class, 'counts']);
        Route::get('/customer/bookings', [CustomerShipmentController::class, 'bookings']);
        Route::get('/customer/reports', [CustomerShipmentController::class, 'reports']);
        Route::get('/customer/shipments', [CustomerShipmentController::class, 'index']);
        Route::get('/customer/shipments/counts', [CustomerShipmentController::class, 'counts']);
        Route::get('/customer/shipments/{trackingNumber}', [CustomerShipmentController::class, 'show']);
        Route::get('/customer/shipments/{trackingNumber}/tracking', [CustomerShipmentController::class, 'tracking']);

        Route::get('/customer/warehouse-addresses', [
            CustomerWarehouseController::class,
            'index',
        ]);

        Route::post('/customer/scan/resolve', [CustomerShipmentController::class, 'resolveScan']);
        Route::get('/customer/scan/recent', [CustomerShipmentController::class, 'recentScans']);
    });

    // FAKE China WayBill API for local testing (404 in production).
    Route::post('/mock-china/WayBill/QueryWayBillSpeed', [
        \App\Http\Controllers\MockWayBillApiController::class,
        'query',
    ]);

    Route::get('/mock-china/image/{n}.svg', [
        \App\Http\Controllers\MockWayBillApiController::class,
        'image',
    ])->where('n', '[0-9]+');

    Route::middleware(['auth:sanctum', 'active-staff'])->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        /*
        |--------------------------------------------------------------------------
        | Shipping Modes
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:shipping_modes.view')->group(function () {
            Route::apiResource('shipping-modes', ShippingModeController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:shipping_modes.manage')->group(function () {
            Route::apiResource('shipping-modes', ShippingModeController::class)
                ->only(['store', 'update', 'destroy']);
        });

        /*
        |--------------------------------------------------------------------------
        | Billing Settings
        |--------------------------------------------------------------------------
        */

        Route::get('/billing/settings', [BillingSettingsController::class, 'show'])
            ->middleware('permission:billing.settings');

        Route::post('/billing/settings/aba-khqr', [BillingSettingsController::class, 'uploadKhqr'])
            ->middleware('permission:billing.settings');

        /*
        |--------------------------------------------------------------------------
        | Users
        |--------------------------------------------------------------------------
        */

        // Static user sub-routes must be declared before /users/{user}.
        Route::get('/users/sales', [UserController::class, 'sales']);
        Route::get('/users/delivery-drivers', [UserController::class, 'deliveryDrivers']);

        Route::middleware('super-admin')->group(function () {
            Route::apiResource('users', UserController::class)
                ->only(['index', 'show', 'store', 'update', 'destroy']);

            Route::post('/users/{id}/reset-password', [
                UserController::class,
                'resetPassword',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Customers
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:customers.view')->group(function () {
            Route::apiResource('customers', CustomerController::class)
                ->only(['index', 'show']);

            Route::get('/customers/{id}/360', [
                CustomerController::class,
                'show360',
            ]);
        });

        Route::middleware('permission:customers.manage')->group(function () {
            Route::apiResource('customers', CustomerController::class)
                ->only(['store', 'update', 'destroy']);
        });

        /*
        |--------------------------------------------------------------------------
        | Packages
        |--------------------------------------------------------------------------
        */

        Route::get('/packages/scan', [PackageController::class, 'scan'])
            ->middleware('permission:packages.view');

        // Must be declared BEFORE apiResource('packages').
        Route::get('/packages/sync-logs', [PackageController::class, 'syncLogs'])
            ->middleware('permission:china_sync.view');

        Route::post('/packages/{id}/movement', [PackageController::class, 'updateMovement'])
            ->middleware('permission:packages.manage');

        Route::middleware('permission:packages.view')->group(function () {
            Route::apiResource('packages', PackageController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:packages.manage')->group(function () {
            Route::apiResource('packages', PackageController::class)
                ->only(['store', 'update', 'destroy']);
        });

        Route::post('/packages/{id}/receive-china', [PackageController::class, 'receiveChina'])
            ->middleware('permission:packages.manage');

        Route::post('/packages/{id}/images', [PackageController::class, 'uploadImages'])
            ->middleware('permission:packages.manage');

        Route::post('/packages/{id}/images/delete', [PackageController::class, 'deleteImage'])
            ->middleware('permission:packages.manage');

        Route::post('/packages/{id}/confirm-received', [
            DeliveryController::class,
            'confirmCustomerReceived',
        ])->middleware('permission:deliveries.manage');

        Route::post('/packages/sync-china', [
            PackageController::class,
            'syncChina',
        ])->middleware('permission:packages.manage');

        /*
        |--------------------------------------------------------------------------
        | China Sync
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:china_sync.view')->group(function () {
            Route::get('/china-sync/status', [ChinaSyncController::class, 'status']);
            Route::get('/china-sync/preview', [ChinaSyncController::class, 'preview']);
            Route::get('/china-sync/logs', [ChinaSyncController::class, 'logs']);

            Route::get('/china-sync/mock/status', [MockChinaApiController::class, 'status']);
            Route::get('/china-sync/mock/data', [MockChinaApiController::class, 'data']);
            Route::get('/china-sync/mock/packages', [MockChinaApiController::class, 'packages']);
            Route::get('/china-sync/mock/packages/{tracking}', [MockChinaApiController::class, 'package']);
            Route::get('/china-sync/mock/containers', [MockChinaApiController::class, 'containers']);
            Route::get('/china-sync/mock/containers/{container}', [MockChinaApiController::class, 'container']);
        });

        Route::post('/china-sync/mock/sync', [MockChinaApiController::class, 'sync'])
            ->middleware('permission:china_sync.manage');

        /*
        |--------------------------------------------------------------------------
        | Shipments
        |--------------------------------------------------------------------------
        */

        Route::get('/shipments/{id}/tracking', [
            ShipmentController::class,
            'tracking',
        ])->middleware('permission:tracking.view');

        Route::post('/shipments/{id}/tracking', [
            ShipmentController::class,
            'addTrackingEvent',
        ])->middleware('permission:shipments.manage');

        Route::middleware('permission:shipments.view')->group(function () {
            Route::apiResource('shipments', ShipmentController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:shipments.manage')->group(function () {
            Route::apiResource('shipments', ShipmentController::class)
                ->only(['store', 'update', 'destroy']);
        });

        /*
        |--------------------------------------------------------------------------
        | Pricing
        |--------------------------------------------------------------------------
        */

        // Keep /pricing/find before /pricing/{pricing}.
        Route::get('/pricing/find', [PricingController::class, 'findRate'])
            ->middleware('permission:pricing.view');

        Route::middleware('permission:pricing.view')->group(function () {
            Route::apiResource('pricing', PricingController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:pricing.manage')->group(function () {
            Route::apiResource('pricing', PricingController::class)
                ->only(['store', 'update']);
        });

        /*
        |--------------------------------------------------------------------------
        | Warehouses
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:warehouses.view')->group(function () {
            Route::apiResource('warehouses', WarehouseController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:warehouses.manage')->group(function () {
            Route::apiResource('warehouses', WarehouseController::class)
                ->only(['store', 'update', 'destroy']);
        });

        Route::middleware('permission:cambodia_warehouse.manage')->group(function () {
            Route::post('/cambodia-warehouse/packages/{id}/receive', [
                CambodiaWarehouseController::class,
                'receive',
            ]);

            Route::post('/cambodia-warehouse/packages/{id}/measure', [
                CambodiaWarehouseController::class,
                'measure',
            ]);

            Route::post('/cambodia-warehouse/packages/{id}/ready-for-billing', [
                CambodiaWarehouseController::class,
                'readyForBilling',
            ]);

            Route::post('/cambodia-warehouse/packages/{id}/customer-pickup', [
                CambodiaWarehouseController::class,
                'confirmCustomerPickup',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Containers
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:containers.view')->group(function () {
            Route::apiResource('containers', ContainerController::class)
                ->only(['index', 'show']);

            Route::get('/containers/{id}/packages', [
                ContainerController::class,
                'packages',
            ]);

            Route::get('/containers/{id}/timeline', [
                ContainerController::class,
                'timeline',
            ]);
        });

        Route::middleware('permission:containers.manage')->group(function () {
            Route::apiResource('containers', ContainerController::class)
                ->only(['store', 'update', 'destroy']);

            Route::post('/containers/{id}/packages', [
                ContainerController::class,
                'attachPackages',
            ]);

            Route::delete('/containers/{id}/packages/{packageId}', [
                ContainerController::class,
                'detachPackage',
            ]);

            Route::put('/containers/{id}/location', [
                ContainerController::class,
                'updateLocation',
            ]);

            Route::post('/containers/{id}/transition', [
                ContainerController::class,
                'transition',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Tracking
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:tracking.view')->group(function () {
            Route::get('/tracking/search', [TrackingController::class, 'search']);
            Route::get('/tracking/{tracking}', [TrackingController::class, 'show']);
        });

        Route::post('/tracking/events', [TrackingController::class, 'store'])
            ->middleware('permission:tracking.manage');

        Route::get('/test-data', [TestDataController::class, 'index'])
            ->middleware('permission:test-data.manage');

        /*
        |--------------------------------------------------------------------------
        | Quotations
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:quotation.view')->group(function () {
            Route::apiResource('quotations', QuotationController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:quotation.manage')->group(function () {
            Route::apiResource('quotations', QuotationController::class)
                ->only(['store', 'update']);

            Route::post('/quotations/{id}/accept', [
                QuotationController::class,
                'accept',
            ]);
        });

        /*
        |--------------------------------------------------------------------------
        | Invoices
        |--------------------------------------------------------------------------
        */

        Route::get('/invoices', [InvoiceController::class, 'index'])
            ->middleware('permission:invoice.view');

        Route::get('/invoices/{id}', [InvoiceController::class, 'show'])
            ->middleware('permission:invoice.view');

        Route::post('/invoices', [InvoiceController::class, 'store'])
            ->middleware('permission:invoice.create');

        Route::put('/invoices/{id}', [InvoiceController::class, 'update'])
            ->middleware('permission:invoice.create');

        Route::patch('/invoices/{id}', [InvoiceController::class, 'update'])
            ->middleware('permission:invoice.create');

        Route::patch('/invoices/{id}/billing', [InvoiceController::class, 'updateBilling'])
            ->middleware('permission:invoice.create');

        /*
        |--------------------------------------------------------------------------
        | Generate Invoice directly from Package
        |--------------------------------------------------------------------------
        */

        Route::post('/invoices/from-package/{packageId}', [
            InvoiceController::class,
            'fromPackage',
        ])->middleware('permission:invoice.create');

        Route::post('/invoices/from-packages', [
            InvoiceController::class,
            'fromPackages',
        ])->middleware('permission:invoice.create');

        /*
        |--------------------------------------------------------------------------
        | Payments
        |--------------------------------------------------------------------------
        */

        Route::get('/payments', [PaymentController::class, 'index'])
            ->middleware('permission:payment.view');

        Route::get('/payments/{payment}', [PaymentController::class, 'show'])
            ->middleware('permission:payment.view');

        Route::post('/payments', [PaymentController::class, 'store'])
            ->middleware('permission:payment.create');

        Route::get('/payments/{payment}/receipt', [
            FinanceController::class,
            'receipt',
        ])->middleware('permission:payment.view');

        /*
        |--------------------------------------------------------------------------
        | Finance
        |--------------------------------------------------------------------------
        */

        Route::get('/finance/closings/export', [
            FinancialClosingController::class,
            'export',
        ])->middleware('permission:finance.view');

        Route::get('/finance/closings', [
            FinancialClosingController::class,
            'index',
        ])->middleware('permission:finance.view');

        Route::post('/finance/closings', [
            FinancialClosingController::class,
            'store',
        ])->middleware('permission:finance.close');

        Route::post('/finance/closings/{closing}/reopen', [
            FinancialClosingController::class,
            'reopen',
        ])->middleware('permission:finance.reopen');

        Route::get('/finance/dashboard', [FinanceController::class, 'dashboard'])
            ->middleware('permission:finance.view');

        Route::get('/finance/customers/{customerId}/statement', [
            FinanceController::class,
            'statement',
        ])->middleware('permission:finance.view');

        /*
        |--------------------------------------------------------------------------
        | Income
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:income.view')->group(function () {
            Route::apiResource('income', IncomeController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:income.manage')->group(function () {
            Route::apiResource('income', IncomeController::class)
                ->only(['store']);
        });

        /*
        |--------------------------------------------------------------------------
        | Expenses
        |--------------------------------------------------------------------------
        */

        // Must be declared BEFORE apiResource('expenses').
        Route::get('/expenses/delivery-summary', [
            ExpenseController::class,
            'deliverySummary',
        ])->middleware('permission:expenses.view');

        Route::middleware('permission:expenses.view')->group(function () {
            Route::apiResource('expenses', ExpenseController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:expenses.manage')->group(function () {
            Route::apiResource('expenses', ExpenseController::class)
                ->only(['store', 'update']);
        });

        /*
        |--------------------------------------------------------------------------
        | Cash Accounts
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:cash.view')->group(function () {
            Route::get('/cash/accounts', [
                CashAccountController::class,
                'index',
            ]);

            Route::get('/cash/accounts/{id}', [
                CashAccountController::class,
                'show',
            ]);
        });

        Route::post('/cash/accounts', [
            CashAccountController::class,
            'store',
        ])->middleware('permission:cash.manage');

        /*
        |--------------------------------------------------------------------------
        | Cash Transactions
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:cash.view')->group(function () {
            Route::get('/cash/transactions', [
                CashTransactionController::class,
                'index',
            ]);

            Route::get('/cash/transactions/{id}', [
                CashTransactionController::class,
                'show',
            ]);
        });

        // NEW: Create cash transaction (cash.manage only).
        Route::post('/cash/transactions', [
            CashTransactionController::class,
            'store',
        ])->middleware('permission:cash.manage');

        /*
        |--------------------------------------------------------------------------
        | CRM / Leads
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:crm.view')->group(function () {
            Route::apiResource('crm/leads', LeadController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:crm.manage')->group(function () {
            Route::apiResource('crm/leads', LeadController::class)
                ->only(['store', 'update', 'destroy']);
        });

        /*
        |--------------------------------------------------------------------------
        | Deliveries
        |--------------------------------------------------------------------------
        */

        Route::middleware('permission:deliveries.view')->group(function () {
            Route::apiResource('deliveries', DeliveryController::class)
                ->only(['index', 'show']);
        });

        Route::middleware('permission:deliveries.manage')->group(function () {
            Route::apiResource('deliveries', DeliveryController::class)
                ->only(['store', 'update']);
        });

        /*
        |--------------------------------------------------------------------------
        | Notifications
        |--------------------------------------------------------------------------
        */

        Route::get('/notifications', [
            NotificationController::class,
            'index',
        ]);

        Route::get('/notifications/unread-count', [
            NotificationController::class,
            'unreadCount',
        ]);

        Route::post('/notifications/{id}/read', [
            NotificationController::class,
            'markRead',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */

        Route::get('/dashboard', [
            DashboardController::class,
            'index',
        ])->middleware('permission:dashboard.view');

        /*
        |--------------------------------------------------------------------------
        | Reports
        |--------------------------------------------------------------------------
        */

        Route::get('/audit-logs', [
            AuditLogController::class,
            'index',
        ])->middleware('permission:report.view');

        Route::prefix('reports')->group(function () {

            Route::get('/shipments', [
                ReportController::class,
                'shipments',
            ])->middleware('permission:report.view');

            Route::get('/customers', [
                ReportController::class,
                'customers',
            ])->middleware('permission:report.view');

            Route::get('/customer-finance', [
                ReportController::class,
                'customerFinance',
            ])->middleware('permission:report.view');

            Route::get('/sales', [
                ReportController::class,
                'sales',
            ])->middleware('permission:report.view');

            Route::get('/finance', [
                ReportController::class,
                'finance',
            ])->middleware('permission:report.view');

            Route::get('/warehouse', [
                ReportController::class,
                'warehouse',
            ])->middleware('permission:report.view');

            Route::get('/deliveries', [
                ReportController::class,
                'deliveries',
            ])->middleware('permission:report.view');

            Route::get('/dashboard', [
                ReportController::class,
                'dashboard',
            ])->middleware('permission:report.view');
        });
    });
});