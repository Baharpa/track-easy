function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function startOfLocalDay(value = new Date()) {
  const date = validDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfLocalDay(value = new Date()) {
  const date = validDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function localDateKey(value = new Date()) {
  const date = validDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDayContext(value = new Date()) {
  const date = validDate(value);
  return {
    date: localDateKey(date),
    startDate: startOfLocalDay(date).toISOString(),
    endDate: endOfLocalDay(date).toISOString(),
    timezoneOffset: date.getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
