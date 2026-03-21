export function parsePage(queryPage = '1', queryPageSize = '10') {
  const page = Math.max(Number.parseInt(queryPage, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(queryPageSize, 10) || 10, 1), 100);

  return { page, pageSize };
}

export function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    totalPages,
  };
}
