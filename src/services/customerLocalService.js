const STORAGE_KEY = 'hfl_customers_v1';
const SESSION_KEY = 'hfl_customer_portal_session_v1';

async function hashPassword(password) {
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return password;
}

const read = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const write = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
const nextSequence = (items) => {
  const max = items.reduce((n, c) => {
    const match = String(c.customerId || '').match(/(\d+)$/);
    return Math.max(n, match ? Number(match[1]) : 0);
  }, 0);
  return max + 1;
};
const code = (n) => String(n).padStart(6, '0');

export function listCustomers(filters = {}) {
  let items = read();
  const q = String(filters.search || '').trim().toLowerCase();
  if (q) items = items.filter(c => [c.customerId, c.username, c.fullName, c.companyName, c.phone, c.email].some(v => String(v || '').toLowerCase().includes(q)));
  if (filters.group && filters.group !== 'All Groups') items = items.filter(c => c.customerGroup === filters.group);
  if (filters.status && filters.status !== 'All Status') items = items.filter(c => c.status === filters.status);
  if (filters.salesOwner && filters.salesOwner !== 'All Sales') items = items.filter(c => String(c.salesOwner || '') === filters.salesOwner);
  return items.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function createCustomer(input) {
  const items = read();
  const n = nextSequence(items);
  const id = code(n);
  const temporaryPassword = input.password || `HFL@${id}`;
  const passwordHash = await hashPassword(temporaryPassword);
  const customer = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    customerId: `HFL-CUS-${id}`,
    username: `HFL${id}`,
    passwordHash,
    fullName: input.fullName?.trim() || '',
    companyName: input.companyName?.trim() || '',
    phone: input.phone?.trim() || '',
    telegram: input.telegram?.trim() || '',
    email: input.email?.trim() || '',
    address: input.address?.trim() || '',
    province: input.province?.trim() || '',
    customerGroup: input.customerGroup || 'General',
    salesOwner: input.salesOwner?.trim() || '',
    registrationDate: input.registrationDate || new Date().toISOString().slice(0,10),
    status: input.status || 'Active',
    notes: input.notes?.trim() || '',
    packageCount: 0,
    shipmentCount: 0,
    totalCbm: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  write([customer, ...items]);
  return customer;
}

export function updateCustomer(id, input) {
  const items = read();
  const existing = items.find(c => c.id === id);
  if (!existing) throw new Error('Customer not found.');
  const updated = { ...existing, ...input, id: existing.id, customerId: existing.customerId, username: existing.username, updatedAt: new Date().toISOString() };
  write(items.map(c => c.id === id ? updated : c));
  return updated;
}

export function disableCustomer(id) {
  return updateCustomer(id, { status: 'Inactive' });
}

export async function resetCustomerPassword(id) {
  const items = read();
  const customer = items.find(c => c.id === id);
  if (!customer) throw new Error('Customer not found.');
  const password = `HFL@${customer.customerId.slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
  const updated = { ...customer, passwordHash: await hashPassword(password), updatedAt: new Date().toISOString() };
  write(items.map(c => c.id === id ? updated : c));
  return password;
}

export function deleteCustomer(id) {
  write(read().filter(c => c.id !== id));
}

export function getCustomer(id) { return read().find(c => c.id === id) || null; }

export async function loginCustomer(username, password) {
  const passwordHash = await hashPassword(password);
  const customer = read().find(c => c.username.toLowerCase() === String(username).trim().toLowerCase() && c.passwordHash === passwordHash && c.status === 'Active');
  if (!customer) throw new Error('Invalid username or password.');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ customerId: customer.id, loggedInAt: new Date().toISOString() }));
  return customer;
}

export function getPortalSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return session ? getCustomer(session.customerId) : null;
  } catch { return null; }
}

export function logoutCustomer() { localStorage.removeItem(SESSION_KEY); }

export function getCustomerGroups() {
  const groups = [...new Set(read().map(c => c.customerGroup).filter(Boolean))];
  return groups.length ? groups : ['General'];
}
