import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(requestFn, options = {}) {
  const { immediate = false, initialData = null } = options;
  const mounted = useRef(true);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  useEffect(() => () => { mounted.current = false; }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFn(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [requestFn]);

  useEffect(() => {
    if (!immediate) return;
    execute().catch(() => {});
  }, [immediate, execute]);

  return { data, setData, loading, error, execute, refetch: execute };
}

export function unwrapApiData(response, fallback = null) {
  if (response?.success === false) return fallback;
  return response?.data ?? response ?? fallback;
}
