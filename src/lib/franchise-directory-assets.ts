import { FRANCHISE_DIRECTORY_CLIENT } from "./franchise-directory-client";
import { FRANCHISE_DIRECTORY_CONTENT_STYLES } from "./franchise-directory-content-styles";
import { FRANCHISE_DIRECTORY_STYLES } from "./franchise-directory-styles";

export function injectDirectoryAssets(html: string) {
  if (html.includes("franchise-directory-generated-css")) return html;

  const withStyles = html.replace(
    "</head>",
    `${FRANCHISE_DIRECTORY_STYLES}
${FRANCHISE_DIRECTORY_CONTENT_STYLES}
</head>`,
  );

  if (withStyles.includes("franchise-directory-generated-js")) return withStyles;

  return withStyles.replace(
    "</body>",
    `${FRANCHISE_DIRECTORY_CLIENT}
</body>`,
  );
}
