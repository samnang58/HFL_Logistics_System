import apiClient from "../api/apiClient.js";

function unwrap(response) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload;
}

function customerPayload(input) {
  return {
    full_name: input.fullName?.trim() || "",
    phone: input.phone?.trim() || "",
    telegram: input.telegram?.trim() || "",
    email: input.email?.trim() || "",
    address: input.address?.trim() || "",
    province: input.province?.trim() || "",
    customer_group: input.customerGroup || "General",

    // IMPORTANT:
    // Laravel expects the real users.id
    sales_owner_id: input.salesOwnerId
      ? Number(input.salesOwnerId)
      : null,

    registration_date:
      input.registrationDate ||
      new Date().toISOString().slice(0, 10),

    status: input.status || "Active",
    notes: input.notes?.trim() || "",
    ...(input.companyName?.trim() ? { company_name: input.companyName.trim() } : {}),
    ...(input.username?.trim() ? { username: input.username.trim() } : {}),
    ...(input.password ? { password: input.password } : {}),
  };
}

export async function listCustomers(filters = {}) {
  const params = {};

  if (filters.search) {
    params.search = filters.search;
  }

  const response = await apiClient.get(
    "/customers",
    params
  );

  const data = unwrap(response);

  return Array.isArray(data) ? data : [];
}

export async function getSalesOwners() {
  const response = await apiClient.get(
    "/users/sales"
  );

  const data = unwrap(response);

  return Array.isArray(data) ? data : [];
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  const payload = response?.data ?? response;
  return payload?.user ?? payload?.data ?? payload;
}

export async function createCustomer(input) {
  const response = await apiClient.post(
    "/customers",
    customerPayload(input)
  );

  return unwrap(response);
}

export async function updateCustomer(id, input) {
  const response = await apiClient.put(
    `/customers/${encodeURIComponent(id)}`,
    customerPayload(input)
  );

  return unwrap(response);
}

export async function deleteCustomer(id) {
  await apiClient.delete(
    `/customers/${encodeURIComponent(id)}`
  );
}

export async function disableCustomer(id) {
  return updateCustomer(id, {
    ...inputForDisable(),
  });
}

function inputForDisable() {
  return {
    fullName: "",
    companyName: "",
    phone: "",
    telegram: "",
    email: "",
    address: "",
    province: "",
    customerGroup: "General",
    salesOwnerId: null,
    registrationDate: "",
    status: "Inactive",
    notes: "",
  };
}
