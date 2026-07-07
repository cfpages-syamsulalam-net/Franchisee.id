import { FRANCHISE_DETAIL_STYLE_ID, renderFranchiseDetailStyles } from "./franchise-detail-styles";
import { renderFranchiseDetailScripts } from "./franchise-detail-scripts";

export function injectDetailAssets(html: string) {
  if (html.includes(FRANCHISE_DETAIL_STYLE_ID)) return html;
  const withStyles = html.replace("</head>", `${renderFranchiseDetailStyles()}
</head>`);
  return withStyles.replace("</body>", `${renderFranchiseDetailScripts()}
</body>`);
}
