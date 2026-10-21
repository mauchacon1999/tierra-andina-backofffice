/** Text as a search compares it: no accents, lower case, no surrounding spaces. */
function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Rows whose `name` contains the query, ignoring accents and case ("name" finds "Ñame").
 * An empty query returns the same array.
 */
export function filterByName<T>(rows: T[], query: string, name: (row: T) => string): T[] {
  const wanted = searchable(query);
  if (wanted === "") return rows;
  return rows.filter((row) => searchable(name(row)).includes(wanted));
}
