const CATEGORIES = [
  ['salgad', 'Pastéis Salgados'],
  ['doce', 'Pastéis Doces'],
  ['bebid', 'Bebidas'],
  ['adicion', 'Adicionais'],
];

export function repairText(value) {
  const text = String(value ?? '');
  if (!/[ÃÂ]/.test(text)) return text;
  const fixed = Buffer.from(text, 'latin1').toString('utf8');
  if (fixed.includes('\uFFFD')) return text;
  return fixed;
}

export function canonicalCategory(value) {
  const text = repairText(value).trim();
  const folded = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  for (const [hint, label] of CATEGORIES) {
    if (folded.includes(hint)) return label;
  }
  return text;
}
