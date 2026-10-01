<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class CustomerController extends CrudController
{
    protected string $model = Customer::class;

    protected array $rules = [
        'full_name' => 'required|string|max:255',
        'company_name' => 'nullable|string|max:255',
        'username' => ['nullable', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/'],
        'password' => 'nullable|string|min:6|max:100',
        'phone' => 'nullable|string|max:50',
        'telegram' => 'nullable|string|max:100',
        'email' => 'nullable|email',
        'address' => 'nullable|string',
        'province' => 'nullable|string',
        'customer_group' => 'nullable|string',
        'sales_owner' => 'nullable|string|max:255',
        'sales_owner_id' => 'nullable|integer|exists:users,id',
        'registration_date' => 'nullable|date',
        'status' => 'nullable|string',
        'notes' => 'nullable|string',
        'created_by' => 'nullable|integer|exists:users,id',
    ];

    protected function searchColumns(): array
    {
        return [
            'customer_id',
            'username',
            'full_name',
            'company_name',
            'phone',
            'email',
        ];
    }

    public function index(Request $request)
    {
        $query = Customer::query()
            ->with([
                'salesOwner:id,name,email,role',
                'createdBy:id,name,email,role'
            ]);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                foreach ($this->searchColumns() as $column) {
                    $q->orWhere($column, 'like', '%' . $search . '%');
                }
            });
        }

        return $this->ok(
            $query->orderByDesc('id')->get(),
            'Customers retrieved successfully'
        );
    }

    public function show360($id)
    {
        $customer = Customer::with('salesOwner:id,name,email,role')->findOrFail($id);

        $packages = \App\Models\Package::where('customer_id', $customer->customer_id)
            ->with('containers')
            ->orderByDesc('id')->get();

        $containerIds = $packages->flatMap(fn ($p) => $p->containers->pluck('id'))->unique()->values();
        $containers = $containerIds->isEmpty() ? collect() : \App\Models\Container::with('shipment')->whereIn('id', $containerIds)->get();

        $shipmentIds = $containers->pluck('shipment_id')->filter()->unique()->values();
        $shipments = $shipmentIds->isEmpty() ? collect() : \App\Models\Shipment::with(['containers','trackingEvents'])->whereIn('id', $shipmentIds)->get();

        $packageIds = $packages->pluck('id');
        $tracking = $packageIds->isEmpty() ? collect() : \App\Models\TrackingEvent::whereIn('package_id', $packageIds)->orderByDesc('event_at')->get();

        $invoices = \App\Models\Invoice::where('customer_id', $customer->customer_id)->orderByDesc('created_at')->get();
        $payments = \App\Models\Payment::where('customer_id', $customer->customer_id)->orderByDesc('paid_at')->get();

        $invoiced = (float) $invoices->sum('grand_total');
        $paid = (float) $payments->where('status', 'Confirmed')->sum('amount');

        return $this->ok([
            'customer' => $customer,
            'packages' => $packages,
            'containers' => $containers,
            'shipments' => $shipments,
            'tracking' => $tracking,
            'invoices' => $invoices,
            'payments' => $payments,
            'summary' => [
                'packages' => $packages->count(),
                'containers' => $containers->count(),
                'shipments' => $shipments->count(),
                'total_cbm' => (float) $packages->sum('total_cbm'),
                'total_weight' => (float) $packages->sum('total_weight'),
                'invoiced' => $invoiced,
                'paid' => $paid,
                'outstanding' => max(0, $invoiced - $paid),
            ],
        ], 'Customer 360');
    }

    public function show($id)
    {
        $customer = Customer::with([
            'salesOwner:id,name,email,role'
        ])->findOrFail($id);

        return $this->ok(
            $customer,
            'Customer retrieved successfully'
        );
    }

    public function store(Request $request)
    {
        $rules = $this->rules;
        $rules['username'][] = Rule::unique('customers', 'username');
        $rules['password'] = 'required|string|min:6|max:100';

        $data = $request->validate($rules, [
            'username.regex' => 'Username may only contain letters, numbers, dot, underscore and dash.',
            'username.unique' => 'This username is already used by another customer.',
            'password.required' => 'Password is required so the customer can sign in.',
        ]);

        // Generate the public HFL Customer ID.
        // Format: HFL00001, HFL00002, ...
        // The sequence is based on the highest numeric HFL Customer ID,
        // not the database auto-increment id, so deleted/legacy rows do not
        // accidentally change the numbering format.
        $lastCustomer = Customer::query()
            ->where('customer_id', 'like', 'HFL%')
            ->orderByDesc('id')
            ->get(['customer_id'])
            ->first(function ($customer) {
                return preg_match('/^HFL(\\d{5})$/', (string) $customer->customer_id);
            });

        $lastNumber = $lastCustomer
            ? (int) substr($lastCustomer->customer_id, 3)
            : 0;

        $nextNumber = $lastNumber + 1;

        do {
            $customerId = 'HFL' . str_pad((string) $nextNumber, 5, '0', STR_PAD_LEFT);
            $nextNumber++;
        } while (Customer::where('customer_id', $customerId)->exists());

        $data['customer_id'] = $customerId;
        // Keep username separate from the Customer ID for backward compatibility.
        $data['username'] = ($data['username'] ?? null) ?: $customerId;
        $data['password'] = Hash::make($data['password']);
        $data['status'] = $data['status'] ?? 'Active';
        $data['registration_date'] =
            $data['registration_date'] ?? now()->toDateString();
        $data['created_by'] = $request->user()?->id;

        // Make sure selected user is a Sales user
        if (!empty($data['sales_owner_id'])) {
            $salesOwner = User::where('id', $data['sales_owner_id'])
                ->where('role', 'Sales')
                ->first();

            if (!$salesOwner) {
                return $this->fail(
                    'Selected Sales Owner is not a valid Sales user.',
                    [],
                    422
                );
            }

            // Keep old text field synchronized
            $data['sales_owner'] = $salesOwner->name;
        }

        $customer = Customer::create($data);

        return $this->ok(
            $customer->load('salesOwner:id,name,email,role'),
            'Customer created successfully'
        );
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $rules = $this->rules;
        $rules['username'][] = Rule::unique('customers', 'username')->ignore($customer->id);

        $data = $request->validate($rules, [
            'username.regex' => 'Username may only contain letters, numbers, dot, underscore and dash.',
            'username.unique' => 'This username is already used by another customer.',
        ]);

        // Customer ID and audit owner must remain unchanged.
        // created_by is always the user who originally created the customer.
        unset(
            $data['customer_id'],
            $data['created_by']
        );

        // Blank username keeps the current one; blank password keeps the current password.
        if (empty($data['username'])) {
            unset($data['username']);
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        // Validate Sales Owner
        if (array_key_exists('sales_owner_id', $data)) {

            if (!empty($data['sales_owner_id'])) {

                $salesOwner = User::where(
                    'id',
                    $data['sales_owner_id']
                )
                    ->where('role', 'Sales')
                    ->first();

                if (!$salesOwner) {
                    return $this->fail(
                        'Selected Sales Owner is not a valid Sales user.',
                        [],
                        422
                    );
                }

                $data['sales_owner'] = $salesOwner->name;

            } else {
                $data['sales_owner'] = null;
            }
        }

        $customer->update($data);

        return $this->ok(
            $customer->fresh()->load(
                'salesOwner:id,name,email,role',
                'createdBy:id,name,email,role'
            ),
            'Customer updated successfully'
        );
    }
}
