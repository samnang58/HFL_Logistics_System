import apiClient from "../api/apiClient.js";

function unwrap(response) {
  return response?.data ?? response;
}

export async function listContainers(params = {}) {
  const response = await apiClient.get("/containers", params);
  const data = unwrap(response);
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : []));
}

export async function getContainer(id) {
  const response = await apiClient.get(`/containers/${encodeURIComponent(id)}`);
  return unwrap(response);
}

export async function createContainer(payload) {
  const response = await apiClient.post("/containers", payload);
  return unwrap(response);
}

export async function updateContainer(id, payload) {
  const response = await apiClient.put(
    `/containers/${encodeURIComponent(id)}`,
    payload
  );
  return unwrap(response);
}

export async function deleteContainer(id) {
  await apiClient.delete(`/containers/${encodeURIComponent(id)}`);
}

export async function getContainerPackages(id) {
  const response = await apiClient.get(
    `/containers/${encodeURIComponent(id)}/packages`
  );
  const data = unwrap(response);
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}

export async function attachPackages(id, packageIds) {
  const response = await apiClient.post(
    `/containers/${encodeURIComponent(id)}/packages`,
    {
      package_ids: packageIds,
    }
  );

  return unwrap(response);
}

export async function detachPackage(containerId, packageId) {
  const response = await apiClient.delete(
    `/containers/${encodeURIComponent(containerId)}/packages/${encodeURIComponent(packageId)}`
  );

  return unwrap(response);
}

export async function updateContainerLocation(id, payload) {
  const response = await apiClient.put(
    `/containers/${encodeURIComponent(id)}/location`,
    payload
  );

  return unwrap(response);
}


export async function transitionContainer(id, payload) {
  const response = await apiClient.post(
    `/containers/${encodeURIComponent(id)}/transition`,
    payload
  );
  return unwrap(response);
}

export async function getContainerTimeline(id) {
  const response = await apiClient.get(
    `/containers/${encodeURIComponent(id)}/timeline`
  );

  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}
