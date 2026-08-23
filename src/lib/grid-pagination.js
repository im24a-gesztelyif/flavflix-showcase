export const TMDB_RESULTS_PER_PAGE = 20;
export const FULL_GRID_PAGE_SIZE = 24;
const MAX_TMDB_PAGES = 500;

export function getLogicalGridPagePlan(page, logicalPageSize = FULL_GRID_PAGE_SIZE) {
  const safePage = Math.max(1, Number(page) || 1);
  const startIndex = (safePage - 1) * logicalPageSize;
  const primaryPage = Math.floor(startIndex / TMDB_RESULTS_PER_PAGE) + 1;
  const offset = startIndex % TMDB_RESULTS_PER_PAGE;
  const secondaryPage = offset + logicalPageSize > TMDB_RESULTS_PER_PAGE ? primaryPage + 1 : null;

  return {
    primaryPage,
    secondaryPage: secondaryPage && secondaryPage <= MAX_TMDB_PAGES ? secondaryPage : null,
    offset,
    logicalPageSize,
  };
}

export function sliceLogicalGridItems(primaryItems = [], secondaryItems = [], plan) {
  return [...primaryItems, ...secondaryItems].slice(plan.offset, plan.offset + plan.logicalPageSize);
}

export function getLogicalGridTotalPages(totalResults = 0, logicalPageSize = FULL_GRID_PAGE_SIZE) {
  const cappedResults = Math.min(Math.max(0, Number(totalResults) || 0), MAX_TMDB_PAGES * TMDB_RESULTS_PER_PAGE);
  return Math.max(1, Math.ceil(cappedResults / logicalPageSize));
}
