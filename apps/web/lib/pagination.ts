export const PAGE_SIZE = 20;

export function getPagination(pageParam?: string | null) {
  const page = Number(pageParam ?? "1");
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  return {
    page: safePage,
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE
  };
}
