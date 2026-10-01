<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Shipment;
use App\Models\Container;
use App\Models\Invoice;
use App\Models\Income;
use App\Models\Expense;
use App\Models\TrackingEvent;
use App\Models\PackageSyncLog;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function index()
    {
        $packageQuery = Package::query();

        $packages = (clone $packageQuery)->count();
        $containers = Container::count();
        $shipments = Shipment::count();

        $inTransit = (clone $packageQuery)->where('status', 'IN_TRANSIT')->count();
        $waitingReceive = (clone $packageQuery)->whereIn('status', ['ARRIVED_CAMBODIA'])->count();
        $arrivedCambodia = (clone $packageQuery)->whereIn('status', ['RECEIVED_CAMBODIA'])->count();
        $readyBilling = (clone $packageQuery)->where('status', 'Ready for Billing')->count();
        $readyDelivery = (clone $packageQuery)->where('status', 'Ready for Delivery')->count();
        $delivered = (clone $packageQuery)->where('status', 'Delivered')->count();
        $chinaWarehouse = (clone $packageQuery)->whereIn('status', ['RECEIVED_CHINA', 'LOADING'])->count();

        $totalCbm = (float) (clone $packageQuery)->sum('total_cbm');
        $totalWeight = (float) (clone $packageQuery)->sum('total_weight');

        $income = (float) Income::sum('amount');
        // Only expenses that were really paid reduce profit (same rule as Finance Control Center).
        $expense = (float) Expense::where('status', 'Paid')->sum('amount');
        $outstanding = (float) Invoice::sum('outstanding');

        $recentActivities = TrackingEvent::query()
            ->orderByDesc('event_at')
            ->limit(5)
            ->get([
                'id', 'tracking_number', 'status', 'location', 'warehouse', 'note', 'event_at',
            ]);

        $lastSync = PackageSyncLog::latest('synced_at')->first();

        return $this->ok([
            'customers' => Customer::count(),
            'packages' => $packages,
            'containers' => $containers,
            'shipments' => $shipments,
            'in_transit' => $inTransit,
            'china_warehouse' => $chinaWarehouse,
            'arrived_cambodia' => $arrivedCambodia,
            'waiting_receive' => $waitingReceive,
            'ready_billing' => $readyBilling,
            'ready_delivery' => $readyDelivery,
            'delivered' => $delivered,
            'total_cbm' => round($totalCbm, 4),
            'total_weight' => round($totalWeight, 2),
            'delivered_rate' => $packages > 0 ? round(($delivered / $packages) * 100) : 0,
            'total_income' => $income,
            'total_expense' => $expense,
            'net_profit' => $income - $expense,
            'outstanding' => $outstanding,
            'recent_activities' => $recentActivities,
            'last_sync' => $lastSync,
            'china_api_mode' => env('CHINA_API_MODE', 'mock'),
        ], 'Live dashboard data');
    }
}
