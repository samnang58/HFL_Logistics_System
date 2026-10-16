<?php

use Illuminate\Support\Facades\Route;


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
    'index'
]);

    Route::post('/customer/scan/resolve', [CustomerShipmentController::class, 'resolveScan']);
    Route::get('/customer/scan/recent', [CustomerShipmentController::class, 'recentScans']);
});
    // FAKE China WayBill API for local testing (404 in production).
    Route::post('/mock-china/WayBill/QueryWayBillSpeed', [\App\Http\Controllers\MockWayBillApiController::class, 'query']);
    Route::get('/mock-china/image/{n}.svg', [\App\Http\Controllers\MockWayBillApiController::class, 'image'])->where('n', '[0-9]+');

    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::apiResource('shipping-modes', ShippingModeController::class)->only(['index','show','store','update','destroy']);

        Route::get('/billing/settings', [BillingSettingsController::class, 'show']);
        Route::post('/billing/settings/aba-khqr', [BillingSettingsController::class, 'uploadKhqr'])->middleware('permission:billing.settings');

        /*
        |--------------------------------------------------------------------------
        | Users
        |--------------------------------------------------------------------------
        */

        // Static user sub-routes must be declared before /users/{user} resource routes.
        Route::get('/users/sales', [UserController::class, 'sales']);
        Route::get('/users/delivery-drivers', [UserController::class, 'deliveryDrivers']);

        Route::middleware('permission:users.manage')->group(function () {
            Route::apiResource('users', UserController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
            Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
        });

        /*
        |--------------------------------------------------------------------------
        | Customers
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'customers',
            CustomerController::class
        );

        Route::get('/customers/{id}/360', [CustomerController::class, 'show360']);

        /*
        |--------------------------------------------------------------------------
        | Packages
        |--------------------------------------------------------------------------
        */

        Route::get('/packages/scan', [PackageController::class, 'scan']);
        // Must be declared BEFORE apiResource('packages') or {id} swallows it.
        Route::get('/packages/sync-logs', [PackageController::class, 'syncLogs']);
        Route::post('/packages/{id}/movement', [PackageController::class, 'updateMovement']);
        Route::apiResource(
            'packages',
            PackageController::class
        );
        Route::post('/packages/{id}/receive-china', [PackageController::class, 'receiveChina']);
        Route::post('/packages/{id}/images', [PackageController::class, 'uploadImages']);
        Route::post('/packages/{id}/images/delete', [PackageController::class, 'deleteImage']);
        Route::post('/packages/{id}/confirm-received', [DeliveryController::class, 'confirmCustomerReceived']);
        Route::post(
            '/packages/sync-china',
            [PackageController::class, 'syncChina']
        );

        Route::get('/china-sync/status', [ChinaSyncController::class, 'status']);
        Route::get('/china-sync/preview', [ChinaSyncController::class, 'preview']);
        Route::get('/china-sync/logs', [ChinaSyncController::class, 'logs']);
        Route::get('/china-sync/mock/status', [MockChinaApiController::class, 'status']);
        Route::get('/china-sync/mock/data', [MockChinaApiController::class, 'data']);
        Route::get('/china-sync/mock/packages', [MockChinaApiController::class, 'packages']);
        Route::get('/china-sync/mock/packages/{tracking}', [MockChinaApiController::class, 'package']);
        Route::get('/china-sync/mock/containers', [MockChinaApiController::class, 'containers']);
        Route::get('/china-sync/mock/containers/{container}', [MockChinaApiController::class, 'container']);
        Route::post('/china-sync/mock/sync', [MockChinaApiController::class, 'sync']);

        /*
        |--------------------------------------------------------------------------
        | Shipments
        |--------------------------------------------------------------------------
        */

        Route::get('/shipments/{id}/tracking', [ShipmentController::class, 'tracking']);
        Route::post('/shipments/{id}/tracking', [ShipmentController::class, 'addTrackingEvent']);
        Route::apiResource('shipments', ShipmentController::class);

        /*
        |--------------------------------------------------------------------------
        | Pricing
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | /pricing/find must come before apiResource('pricing')
        |
        */

        Route::get(
            '/pricing/find',
            [PricingController::class, 'findRate']
        );

        Route::apiResource(
            'pricing',
            PricingController::class
        )->except(['destroy']);

        /*
        |--------------------------------------------------------------------------
        | Warehouses
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'warehouses',
            WarehouseController::class
        );

        Route::post('/cambodia-warehouse/packages/{id}/receive', [CambodiaWarehouseController::class, 'receive']);
        Route::post('/cambodia-warehouse/packages/{id}/measure', [CambodiaWarehouseController::class, 'measure']);
        Route::post('/cambodia-warehouse/packages/{id}/ready-for-billing', [CambodiaWarehouseController::class, 'readyForBilling']);
        Route::post('/cambodia-warehouse/packages/{id}/customer-pickup', [CambodiaWarehouseController::class, 'confirmCustomerPickup']);

        /*
        |--------------------------------------------------------------------------
        | Containers
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'containers',
            ContainerController::class
        );

        Route::post(
            '/containers/{id}/packages',
            [ContainerController::class, 'attachPackages']
        );

        Route::delete(
            '/containers/{id}/packages/{packageId}',
            [ContainerController::class, 'detachPackage']
        );

        Route::put(
            '/containers/{id}/location',
            [ContainerController::class, 'updateLocation']
        );

        Route::post(
            '/containers/{id}/transition',
            [ContainerController::class, 'transition']
        );

        Route::get(
            '/containers/{id}/packages',
            [ContainerController::class, 'packages']
        );

        Route::get(
            '/containers/{id}/timeline',
            [ContainerController::class, 'timeline']
        );

        /*
        |--------------------------------------------------------------------------
        | Tracking
        |--------------------------------------------------------------------------
        */

        Route::get('/tracking/search', [TrackingController::class, 'search']);

        Route::get(
            '/tracking/{tracking}',
            [TrackingController::class, 'show']
        );

        Route::post(
            '/tracking/events',
            [TrackingController::class, 'store']
        );

        Route::get('/test-data', [TestDataController::class, 'index'])
            ->middleware('permission:test-data.manage');


        /*
        |--------------------------------------------------------------------------
        | Quotations
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'quotations',
            QuotationController::class
        )->except(['destroy']);

        Route::post(
            '/quotations/{id}/accept',
            [QuotationController::class, 'accept']
        );

        /*
        |--------------------------------------------------------------------------
        | Invoices
        |--------------------------------------------------------------------------
        */

        Route::get('/invoices', [InvoiceController::class, 'index'])->middleware('permission:invoice.view');
        Route::get('/invoices/{id}', [InvoiceController::class, 'show'])->middleware('permission:invoice.view');
        Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('permission:invoice.create');
        Route::put('/invoices/{id}', [InvoiceController::class, 'update'])->middleware('permission:invoice.create');
        Route::patch('/invoices/{id}', [InvoiceController::class, 'update'])->middleware('permission:invoice.create');
        Route::patch('/invoices/{id}/billing', [InvoiceController::class, 'updateBilling'])->middleware('permission:invoice.create');

        /*
        | Generate Invoice directly from Package
        |
        | Package
        |   ↓
        | Auto Pricing
        |   ↓
        | Generate Invoice
        */

        Route::post(
            '/invoices/from-package/{packageId}',
            [InvoiceController::class, 'fromPackage']
        )->middleware('permission:invoice.create');

        Route::post(
            '/invoices/from-packages',
            [InvoiceController::class, 'fromPackages']
        )->middleware('permission:invoice.create');

        /*
        |--------------------------------------------------------------------------
        | Payments
        |--------------------------------------------------------------------------
        */

        Route::get('/payments', [PaymentController::class, 'index'])->middleware('permission:payment.view');
        Route::get('/payments/{payment}', [PaymentController::class, 'show'])->middleware('permission:payment.view');
        Route::post('/payments', [PaymentController::class, 'store'])->middleware('permission:payment.create');

        Route::get('/payments/{payment}/receipt', [FinanceController::class, 'receipt'])->middleware('permission:payment.view');
        Route::get('/finance/dashboard', [FinanceController::class, 'dashboard']);
        Route::get('/finance/customers/{customerId}/statement', [FinanceController::class, 'statement']);

        /*
        |--------------------------------------------------------------------------
        | Income
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'income',
            IncomeController::class
        )->only([
            'index',
            'show',
            'store'
        ]);

        /*
        |--------------------------------------------------------------------------
        | Expenses
        |--------------------------------------------------------------------------
        */

        // Must be declared BEFORE the apiResource below or {expense} swallows it.
        Route::get('/expenses/delivery-summary', [ExpenseController::class, 'deliverySummary']);

        Route::apiResource(
            'expenses',
            ExpenseController::class
        )->except(['destroy']);

        /*
        |--------------------------------------------------------------------------
        | CRM / Leads
        |--------------------------------------------------------------------------
        */

        Route::apiResource(
            'crm/leads',
            LeadController::class
        );

        Route::apiResource('deliveries', DeliveryController::class)->only(['index','show','store','update']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);

        /*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/dashboard',
            [DashboardController::class, 'index']
        );

        /*
        |--------------------------------------------------------------------------
        | Reports
        |--------------------------------------------------------------------------
        */

        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:report.view');

        Route::prefix('reports')->group(function () {

            Route::get(
                '/shipments',
                [ReportController::class, 'shipments']
            );

            Route::get(
                '/customers',
                [ReportController::class, 'customers']
            );

            Route::get(
                '/customer-finance',
                [ReportController::class, 'customerFinance']
            );

            Route::get(
                '/sales',
                [ReportController::class, 'sales']
            );

            Route::get(
                '/finance',
                [ReportController::class, 'finance']
            );

            Route::get(
                '/warehouse',
                [ReportController::class, 'warehouse']
            );

            Route::get('/deliveries', [ReportController::class, 'deliveries'])->middleware('permission:report.view');
            Route::get('/dashboard', [ReportController::class, 'dashboard'])->middleware('permission:report.view');
        });
    });
});
