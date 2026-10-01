const HFL_TIME_ZONE = 'Asia/Phnom_Penh';

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHflDateTime(value, options = {}) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HFL_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

export function formatHflDate(value) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HFL_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatHflTime(value) {
  const date = parseDate(value);
  if (!date) return value ? String(value) : '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HFL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export { HFL_TIME_ZONE };
