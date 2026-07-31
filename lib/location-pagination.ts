export const LOCATION_PAGE_SIZE = 5;

export function getLocationPageCount(
  itemCount: number,
  pageSize = LOCATION_PAGE_SIZE,
) {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, itemCount) / pageSize));
}

export function clampLocationPage(
  page: number,
  itemCount: number,
  pageSize = LOCATION_PAGE_SIZE,
) {
  return Math.min(
    Math.max(1, Math.trunc(page) || 1),
    getLocationPageCount(itemCount, pageSize),
  );
}

export function getLocationPageItems<T>(
  items: ReadonlyArray<T>,
  page: number,
  pageSize = LOCATION_PAGE_SIZE,
) {
  const safePage = clampLocationPage(page, items.length, pageSize);
  const startIndex = (safePage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}
