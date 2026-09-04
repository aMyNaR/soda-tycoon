export function fmt(n) {
  if (n == null) return '0';
  return new Intl.NumberFormat('fa-IR').format(n);
}
export function dt(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('fa-IR');
}
