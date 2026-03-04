export function formatDate(isoDate) {
  if (!isoDate) {
    return 'Няма дата';
  }

  const date = new Date(isoDate);

  return new Intl.DateTimeFormat('bg-BG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function truncateText(value = '', maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
