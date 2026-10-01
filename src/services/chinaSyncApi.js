import apiClient from "../api/apiClient.js";

const unwrap = (r) => r?.data ?? r;
export const chinaSyncApi = {
  status: async () => unwrap(await apiClient.get("/china-sync/status")),
  preview: async (params={}) => unwrap(await apiClient.get("/china-sync/preview", params)),
  run: async (params={}) => unwrap(await apiClient.post("/packages/sync-china", params)),
  logs: async (params={}) => unwrap(await apiClient.get("/china-sync/logs", params)),
};
export async function listChinaPackages(params={}) {
  const r = await apiClient.get("/packages", params);
  const d = unwrap(r);
  return d?.data ?? (Array.isArray(d) ? d : []);
}
