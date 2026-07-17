export interface CategoryRouteResolution {
  slug: string;
  label: string;
}

export const CATEGORY_ROUTE_ALIASES: Readonly<Record<string, Readonly<CategoryRouteResolution>>>;
export function categoryRouteSlug(value: unknown): string;
export function resolveCategoryRoute(value: unknown): CategoryRouteResolution;
export function canonicalCategoryPath(value: unknown): string;
