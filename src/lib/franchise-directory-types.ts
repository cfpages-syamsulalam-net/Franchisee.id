import type { D1FranchiseRow } from "./shared-schemas";

export interface DirectoryPageOptions {
  title: string;
  description: string;
  canonicalPath: string;
  rows?: D1FranchiseRow[];
  introHtml?: string;
  subheading?: string;
  indexable?: boolean;
}

export interface CategoryRouteEntry {
  slug: string;
  label: string;
  rows: D1FranchiseRow[];
  canonicalPath: string;
  indexable: boolean;
}
