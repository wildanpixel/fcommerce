const GENERIC_STORE_CATEGORY = /^(?:all|all products?|categories|category|home|shop|store|semua|semua produk|kategori|beranda|produk|toko)$/iu;

export function normalizeStoreCategoryLabel(value: string): string | undefined {
  const compact = value.replace(/\s+/gu, " ").trim();
  if (!compact) return undefined;

  const countMatch = compact.match(/\(\s*(\d{1,7})\s*\)\s*$/u);
  const rawName = (countMatch ? compact.slice(0, countMatch.index) : compact)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (rawName.length < 2 || rawName.length > 100 || GENERIC_STORE_CATEGORY.test(rawName)) {
    return undefined;
  }
  if (/(?:rating|penilaian|within minutes|dalam hitungan menit)/iu.test(rawName)) {
    return undefined;
  }
  return countMatch ? `${rawName} (${countMatch[1]})` : rawName;
}

export function normalizeStoreCategoryLabels(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeStoreCategoryLabel(value);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}
