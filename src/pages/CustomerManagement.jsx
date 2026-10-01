import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  Users,
  Crown,
  X,
  UserX,
  Save,
  BarChart3,
} from 'lucide-react';

import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  getSalesOwners,
  getCurrentUser,
} from '../services/customerApi.js';

const cn = (...items) => items.filter(Boolean).join(' ');

const input =
  'mt-1 w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400';

const textarea =
  'mt-1 w-full min-h-[90px] border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400';

const empty = {
  fullName: '',
  companyName: '',
  username: '',
  password: '',
  phone: '',
  telegram: '',
  email: '',
  address: '',
  province: '',
  customerGroup: 'General',
  salesOwnerId: '',
  status: 'Active',
  notes: '',
};

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function unwrap(response) {
  return response?.data ?? response;
}

function normalizeCustomer(customer) {
  return {
    ...customer,

    id: customer?.id,

    customerId:
      customer?.customerId ??
      customer?.customer_id ??
      '',

    username:
      customer?.username ??
      '',

    fullName:
      customer?.fullName ??
      customer?.full_name ??
      '',

    companyName:
      customer?.companyName ??
      customer?.company_name ??
      '',

    phone:
      customer?.phone ??
      '',

    telegram:
      customer?.telegram ??
      '',

    email:
      customer?.email ??
      '',

    address:
      customer?.address ??
      '',

    province:
      customer?.province ??
      '',

    customerGroup:
      customer?.customerGroup ??
      customer?.customer_group ??
      'General',

    salesOwnerId:
      customer?.salesOwnerId ??
      customer?.sales_owner_id ??
      customer?.salesOwner?.id ??
      '',

    salesOwner:
      customer?.salesOwner ??
      customer?.sales_owner ??
      '',

    status:
      customer?.status ??
      'Active',

    notes:
      customer?.notes ??
      '',

    registrationDate:
      customer?.registrationDate ??
      customer?.registration_date ??
      '',

    createdBy:
      customer?.createdBy ??
      customer?.created_by_user ??
      null,
  };
}

function customerToForm(customer) {
  const c = normalizeCustomer(customer);

  return {
    fullName: c.fullName,
    companyName: c.companyName,
    username: c.username || '',
    password: '',
    phone: c.phone,
    telegram: c.telegram,
    email: c.email,
    address: c.address,
    province: c.province,
    customerGroup: c.customerGroup || 'General',
    salesOwnerId: c.salesOwnerId
      ? String(c.salesOwnerId)
      : '',
    status: c.status || 'Active',
    notes: c.notes,
  };
}

function getSalesOwnerName(customer) {
  const owner = customer?.salesOwner;

  if (owner && typeof owner === 'object') {
    return owner.name || '';
  }

  return String(
    owner ||
      customer?.sales_owner ||
      ''
  );
}

function StatusBadge({ status }) {
  const active =
    String(status).toLowerCase() === 'active';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold',
        active
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-red-50 text-red-600'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function Button({
  children,
  onClick,
  type = 'button',
  variant = 'default',
  disabled = false,
  className = '',
}) {
  const variants = {
    default:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',

    primary:
      'bg-blue-600 text-white hover:bg-blue-700',

    danger:
      'bg-red-600 text-white hover:bg-red-700',

    ghost:
      'text-slate-600 hover:bg-slate-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required = false,
  children,
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600">
        {label}
        {required ? ' *' : ''}
      </span>

      {children}
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
  width = 'max-w-3xl',
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
          width
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function CustomerManagement() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [search, setSearch] = useState('');
  const [group, setGroup] =
    useState('All Groups');

  const [status, setStatus] =
    useState('All Status');

  const [salesOwner, setSalesOwner] =
    useState('All Sales');

  const [modal, setModal] =
    useState(null);

  const [form, setForm] =
    useState(empty);

  const [selected, setSelected] =
    useState(null);

  const [message, setMessage] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage('');

      const [
        customerResponse,
        salesResponse,
        meResponse,
      ] = await Promise.all([
        listCustomers(),
        getSalesOwners(),
        getCurrentUser(),
      ]);

      const customerData =
        unwrap(customerResponse);

      const salesData =
        unwrap(salesResponse);

      setCurrentUser(meResponse || null);

      const normalizedCustomers =
        Array.isArray(customerData)
          ? customerData.map(normalizeCustomer)
          : [];

      const normalizedSales =
        Array.isArray(salesData)
          ? salesData
          : [];

      setRows(normalizedCustomers);
      setSalesUsers(normalizedSales);
    } catch (error) {
      console.error(
        'Customer API error:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Failed to load customer data.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const groups = useMemo(() => {
    const values = rows
      .map(
        (customer) =>
          customer.customerGroup
      )
      .filter(Boolean);

    return [
      ...new Set(values),
    ].sort();
  }, [rows]);

  const salesOwners = salesUsers;

  const filteredRows = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return rows.filter((customer) => {
      const ownerName =
        getSalesOwnerName(customer);

      const matchesSearch =
        !keyword ||
        [
          customer.customerId,
          customer.username,
          customer.fullName,
          customer.companyName,
          customer.phone,
          customer.email,
          ownerName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(keyword)
          );

      const matchesGroup =
        group === 'All Groups' ||
        customer.customerGroup === group;

      const matchesStatus =
        status === 'All Status' ||
        customer.status === status;

      const matchesSales =
        salesOwner === 'All Sales' ||
        String(
          customer.salesOwnerId || ''
        ) === String(salesOwner);

      return (
        matchesSearch &&
        matchesGroup &&
        matchesStatus &&
        matchesSales
      );
    });
  }, [
    rows,
    search,
    group,
    status,
    salesOwner,
  ]);

  const stats = useMemo(() => {
    const total = rows.length;

    const active = rows.filter(
      (customer) =>
        String(customer.status)
          .toLowerCase() === 'active'
    ).length;

    const inactive = rows.filter(
      (customer) =>
        String(customer.status)
          .toLowerCase() !== 'active'
    ).length;

    const companies = rows.filter(
      (customer) =>
        String(customer.companyName || '')
          .trim()
    ).length;

    return {
      total,
      active,
      inactive,
      companies,
    };
  }, [rows]);

  function openCreate() {
    setShowPassword(false);
    setSelected(null);
    setForm({
      ...empty,
    });
    setMessage('');
    setErrorMessage('');
    setModal('form');
  }

  function openEdit(customer) {
    setShowPassword(false);
    setSelected(customer);
    setForm(
      customerToForm(customer)
    );
    setMessage('');
    setErrorMessage('');
    setModal('form');
  }

  function openView(customer) {
    setSelected(customer);
    setModal('view');
  }

  function closeModal() {
    if (saving) return;

    setModal(null);
    setSelected(null);
    setForm({
      ...empty,
    });
  }

  function handleChange(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveCustomer(event) {
    event.preventDefault();

    setMessage('');
    setErrorMessage('');

    if (!form.fullName.trim()) {
      setErrorMessage(
        'Full Name is required.'
      );
      return;
    }

    if (!form.salesOwnerId) {
      setErrorMessage(
        'Please select a Sales Owner.'
      );
      return;
    }

    if (!selected && String(form.password || '').length < 6) {
      setErrorMessage(
        'Password is required (at least 6 characters) so the customer can sign in.'
      );
      return;
    }

    if (selected && form.password && String(form.password).length < 6) {
      setErrorMessage(
        'New password must be at least 6 characters.'
      );
      return;
    }

    try {
      setSaving(true);

      if (selected) {
        await updateCustomer(
          selected.id,
          form
        );

        setMessage(
          'Customer updated successfully.'
        );
      } else {
        const created =
          await createCustomer(form);

        const customer =
          normalizeCustomer(
            unwrap(created)
          );

        setMessage(
          `Customer created successfully${
            customer.customerId
              ? `: ${customer.customerId}`
              : ''
          }`
        );
      }

      await loadData();

      setModal(null);
      setSelected(null);
      setForm({
        ...empty,
      });
    } catch (error) {
      console.error(
        'Save customer error:',
        error
      );

      const validationErrors =
        error?.errors || {};

      const firstValidationError =
        Object.values(
          validationErrors
        )?.[0];

      setErrorMessage(
        Array.isArray(
          firstValidationError
        )
          ? firstValidationError[0]
          : error?.message ||
              'Failed to save customer.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(customer) {
    const nextStatus =
      String(customer.status)
        .toLowerCase() === 'active'
        ? 'Inactive'
        : 'Active';

    const action =
      nextStatus === 'Inactive'
        ? 'disable'
        : 'activate';

    const confirmed =
      window.confirm(
        `${action === 'disable' ? 'Disable' : 'Activate'} ${
          customer.customerId ||
          customer.fullName
        }?`
      );

    if (!confirmed) return;

    try {
      setErrorMessage('');

      await updateCustomer(
        customer.id,
        {
          ...customerToForm(customer),
          status: nextStatus,
        }
      );

      await loadData();
    } catch (error) {
      console.error(
        'Status update error:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Failed to update customer status.'
      );
    }
  }

  async function removeCustomer(
    customer
  ) {
    const confirmed =
      window.confirm(
        `Delete ${
          customer.customerId ||
          customer.fullName
        } permanently?`
      );

    if (!confirmed) return;

    try {
      setErrorMessage('');

      await deleteCustomer(
        customer.id
      );

      await loadData();

      setMessage(
        'Customer deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Delete customer error:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Failed to delete customer.'
      );
    }
  }

  function resetFilters() {
    setSearch('');
    setGroup('All Groups');
    setStatus('All Status');
    setSalesOwner('All Sales');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Users size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Customer Management
                </h1>

                <p className="text-sm text-slate-500">
                  Manage customers, Sales Owners and customer accounts
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={openCreate}
          >
            <Plus size={17} />
            Add Customer
          </Button>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Total Customers
                </p>

                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {stats.total}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={19} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Active Customers
                </p>

                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  {stats.active}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserRound size={19} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Inactive Customers
                </p>

                <p className="text-2xl font-bold text-red-600 mt-2">
                  {stats.inactive}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <UserX size={19} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Company Customers
                </p>

                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {stats.companies}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 size={19} />
              </div>
            </div>
          </div>

        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">

            <div className="xl:col-span-2 relative">
              <Search
                size={17}
                className="absolute left-3 top-[13px] text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, ID, phone, email..."
                className={cn(
                  input,
                  'pl-10'
                )}
              />
            </div>

            <select
              value={group}
              onChange={(event) =>
                setGroup(
                  event.target.value
                )
              }
              className={input}
            >
              <option>
                All Groups
              </option>

              {groups.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
              className={input}
            >
              <option>
                All Status
              </option>
              <option value="Active">
                Active
              </option>
              <option value="Inactive">
                Inactive
              </option>
            </select>

            <select
              value={salesOwner}
              onChange={(event) =>
                setSalesOwner(
                  event.target.value
                )
              }
              className={input}
            >
              <option value="All Sales">
                All Sales
              </option>

              {salesOwners.map(
                (sales) => (
                  <option
                    key={sales.id}
                    value={sales.id}
                  >
                    {sales.name}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="flex justify-end mt-3">
            <Button
              variant="ghost"
              onClick={resetFilters}
            >
              <RotateCcw size={15} />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Customers
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Showing {filteredRows.length} of {rows.length} customers
              </p>
            </div>

            {loading && (
              <div className="text-xs text-slate-500">
                Loading...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">

              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Customer
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Company
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Phone
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Sales Owner
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Group
                  </th>

                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Status
                  </th>

                  <th className="text-right px-5 py-3 text-[11px] font-bold text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-16 text-center text-sm text-slate-500"
                    >
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-16 text-center"
                    >
                      <Users
                        size={34}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-slate-600">
                        No customers found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(
                    (customer) => {
                      const ownerName =
                        getSalesOwnerName(
                          customer
                        );

                      return (
                        <tr
                          key={customer.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <UserRound
                                  size={17}
                                />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {customer.fullName ||
                                    customer.companyName ||
                                    'Unnamed Customer'}
                                </p>

                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {customer.customerId ||
                                    '-'}
                                </p>

                                {customer.username && (
                                  <p className="text-[10px] text-slate-400">
                                    @{customer.username}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.companyName ||
                              '-'}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {customer.phone ||
                              '-'}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Crown
                                size={14}
                                className="text-amber-500"
                              />

                              <span className="text-sm text-slate-700">
                                {ownerName ||
                                  'Not assigned'}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              {customer.customerGroup ||
                                'General'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                customer.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">

                              <button
                                type="button"
                                title="View"
                                onClick={() =>
                                  openView(
                                    customer
                                  )
                                }
                                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                title="Customer 360"
                                onClick={() =>
                                  navigate(`/customer/${encodeURIComponent(customer.id)}`)
                                }
                                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-600 flex items-center justify-center"
                              >
                                <BarChart3 size={16} />
                              </button>

                              <button
                                type="button"
                                title="Edit"
                                onClick={() =>
                                  openEdit(
                                    customer
                                  )
                                }
                                className="w-9 h-9 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                title={
                                  String(
                                    customer.status
                                  ).toLowerCase() ===
                                  'active'
                                    ? 'Disable'
                                    : 'Activate'
                                }
                                onClick={() =>
                                  toggleStatus(
                                    customer
                                  )
                                }
                                className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center',
                                  String(
                                    customer.status
                                  ).toLowerCase() ===
                                    'active'
                                    ? 'text-red-500 hover:bg-red-50'
                                    : 'text-emerald-500 hover:bg-emerald-50'
                                )}
                              >
                                <UserX
                                  size={16}
                                />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>

      {/* Create / Edit Modal */}
      {modal === 'form' && (
        <Modal
          title={
            selected
              ? 'Edit Customer'
              : 'Add Customer'
          }
          onClose={closeModal}
        >
          <form
            onSubmit={saveCustomer}
            className="p-6"
          >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <Field
                label="Full Name"
                required
              >
                <input
                  className={input}
                  value={form.fullName}
                  onChange={(event) =>
                    handleChange(
                      'fullName',
                      event.target.value
                    )
                  }
                  placeholder="Enter full name"
                />
              </Field>

              <Field
                label={selected ? 'Username' : 'Username (leave blank to use Customer ID)'}
              >
                <input
                  className={input}
                  value={form.username}
                  autoComplete="off"
                  onChange={(event) =>
                    handleChange(
                      'username',
                      event.target.value
                    )
                  }
                  placeholder="e.g. sokha168"
                />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label={selected ? 'New Password (leave blank to keep current)' : 'Password'}
                  required={!selected}
                >
                  <div className="flex gap-2">
                    <input
                      className={input}
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      autoComplete="new-password"
                      onChange={(event) =>
                        handleChange(
                          'password',
                          event.target.value
                        )
                      }
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="mt-1 h-10 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('password', generatePassword());
                        setShowPassword(true);
                      }}
                      className="mt-1 h-10 px-3 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-400">
                    The customer signs in to the app with this Username + Password. The password is stored encrypted and cannot be viewed later, so copy it now.
                  </span>
                </Field>
              </div>

              <Field label="Phone">
                <input
                  className={input}
                  value={form.phone}
                  onChange={(event) =>
                    handleChange(
                      'phone',
                      event.target.value
                    )
                  }
                  placeholder="Enter phone number"
                />
              </Field>

              <Field label="Telegram">
                <input
                  className={input}
                  value={form.telegram}
                  onChange={(event) =>
                    handleChange(
                      'telegram',
                      event.target.value
                    )
                  }
                  placeholder="@username"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className={input}
                  value={form.email}
                  onChange={(event) =>
                    handleChange(
                      'email',
                      event.target.value
                    )
                  }
                  placeholder="customer@example.com"
                />
              </Field>

              <Field label="Province">
                <input
                  className={input}
                  value={form.province}
                  onChange={(event) =>
                    handleChange(
                      'province',
                      event.target.value
                    )
                  }
                  placeholder="Enter province"
                />
              </Field>

              <Field label="Customer Group">
                <select
                  className={input}
                  value={
                    form.customerGroup
                  }
                  onChange={(event) =>
                    handleChange(
                      'customerGroup',
                      event.target.value
                    )
                  }
                >
                  <option value="General">
                    General
                  </option>

                  <option value="VIP">
                    VIP
                  </option>

                  <option value="Business">
                    Business
                  </option>

                  <option value="Wholesale">
                    Wholesale
                  </option>
                </select>
              </Field>

              <Field
                label="Sales Owner"
                required
              >
                <select
                  className={input}
                  value={
                    form.salesOwnerId || ''
                  }
                  onChange={(event) =>
                    handleChange(
                      'salesOwnerId',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select Sales Owner
                  </option>

                  {salesOwners.map(
                    (sales) => (
                      <option
                        key={sales.id}
                        value={sales.id}
                      >
                        {sales.name}
                      </option>
                    )
                  )}
                </select>

                {salesOwners.length === 0 && (
                  <span className="text-[11px] text-red-600 mt-1 block">
                    No Sales users found in the system.
                  </span>
                )}
              </Field>

              <Field label="Status">
                <select
                  className={input}
                  value={form.status}
                  onChange={(event) =>
                    handleChange(
                      'status',
                      event.target.value
                    )
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </Field>

              <Field label="Address">
                <input
                  className={input}
                  value={form.address}
                  onChange={(event) =>
                    handleChange(
                      'address',
                      event.target.value
                    )
                  }
                  placeholder="Enter address"
                />
              </Field>

            </div>

            <div className="mt-5">
              <Field label="Notes">
                <textarea
                  className={textarea}
                  value={form.notes}
                  onChange={(event) =>
                    handleChange(
                      'notes',
                      event.target.value
                    )
                  }
                  placeholder="Additional notes..."
                />
              </Field>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold text-slate-600">
                Created By
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {selected?.createdBy?.name || currentUser?.name || 'Current logged-in user'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Automatically recorded from the logged-in user. This field cannot be edited.
              </div>
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
              <Button
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                <Save size={16} />

                {saving
                  ? 'Saving...'
                  : selected
                    ? 'Update Customer'
                    : 'Create Customer'}
              </Button>
            </div>

          </form>
        </Modal>
      )}

      {/* View Modal */}
      {modal === 'view' &&
        selected && (
          <Modal
            title="Customer Details"
            onClose={closeModal}
          >
            <div className="p-6">

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserRound size={26} />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selected.fullName ||
                      selected.companyName ||
                      'Unnamed Customer'}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {selected.customerId ||
                      '-'}
                  </p>
                </div>

                <div className="ml-auto">
                  <StatusBadge
                    status={
                      selected.status
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <Info
                  label="Customer ID"
                  value={
                    selected.customerId
                  }
                />

                <Info
                  label="Username"
                  value={
                    selected.username
                  }
                />

                <Info
                  label="Full Name"
                  value={
                    selected.fullName
                  }
                />

                <Info
                  label="Company"
                  value={
                    selected.companyName
                  }
                />

                <Info
                  label="Phone"
                  value={
                    selected.phone
                  }
                />

                <Info
                  label="Telegram"
                  value={
                    selected.telegram
                  }
                />

                <Info
                  label="Email"
                  value={
                    selected.email
                  }
                />

                <Info
                  label="Province"
                  value={
                    selected.province
                  }
                />

                <Info
                  label="Customer Group"
                  value={
                    selected.customerGroup
                  }
                />

                <Info
                  label="Sales Owner"
                  value={
                    getSalesOwnerName(
                      selected
                    )
                  }
                />

                <Info
                  label="Registration Date"
                  value={
                    selected.registrationDate
                  }
                />

                <Info
                  label="Status"
                  value={
                    selected.status
                  }
                />

              </div>

              <div className="mt-4">
                <Info
                  label="Address"
                  value={
                    selected.address
                  }
                />
              </div>

              <div className="mt-4">
                <Info
                  label="Notes"
                  value={
                    selected.notes
                  }
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-100">
                <Button
                  onClick={() =>
                    openEdit(selected)
                  }
                >
                  <Pencil size={15} />
                  Edit
                </Button>

                <Button
                  variant="primary"
                  onClick={closeModal}
                >
                  Close
                </Button>
              </div>

            </div>
          </Modal>
        )}

    </div>
  );
}

function Info({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="text-sm font-medium text-slate-700 mt-1 break-words">
        {value || '-'}
      </p>
    </div>
  );
}
