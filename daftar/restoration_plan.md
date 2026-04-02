# Restoration Plan: /daftar/index.html

The current version (`10dc93f`) removed significant boilerplate and styles, which disrupted the visual design and SEO integrity. This plan aims to merge the best of both: the "Clean" external logic from the current version and the "Rich Aesthetics" and SEO from the previous version (`362415c`).

## 1. What to Restore (from 362415c)
- [x] **SEO Metadata**: Rank Math JSON-LD Schema (essential for Rich Snippets).
- [x] **Open Graph (OG) Tags**: Fixes link previews on social media.
- [x] **Astra Global CSS**: The massive inline block that controls layout, typography, and colors.
- [x] **Elementor Widget Styles**: Critical for the form's multi-column layout and tab styling.
- [x] **Footer Structure**: Restore the detailed multi-column footer and copyright section.

## 2. What to Keep (from current version)
- [x] **Externalized Logic**: Links to `/js/form-utils.js` and `/js/form-franchise.js`.
- [x] **SweetAlert2**: Professional UI feedback via `https://cdn.jsdelivr.net/npm/sweetalert2@11`.
- [x] **Improved Claim Workflow**: The updated `fillMainFranchisorForm` and `exitClaimMode` logic.

## 3. Implementation Steps
1. [x] **Header Reconstruction**: 
   - Re-inserted the SEO meta tags and the Rank Math JSON-LD script.
   - Re-inserted the `<style id="astra-theme-css-inline-css">` block.
2. [x] **Footer Reconstruction**:
   - Restored the full `<footer id="colophon">` section.
3. [x] **Validation**:
   - Ensured the form still functions correctly with the restored styles.
   - Verified that all `onclick` handlers (e.g., `openTab`, `nextStep`) still point to the external JS.

## 4. Risks & Mitigations
- **Conflict**: Restoration of old CSS might conflict with any new manual styles. 
- **Mitigation**: I have placed the external JS calls *after* the theme scripts to ensure they take precedence in event handling.
- **Verification**: Line count was verified to ensure zero-loss of the restored content.
