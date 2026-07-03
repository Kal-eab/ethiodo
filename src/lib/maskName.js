// Masks a customer name for public display on reviews, e.g. "Kaleb" -> "K***b".
export function maskName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Anonymous';
  if (trimmed.length <= 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${'*'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}
