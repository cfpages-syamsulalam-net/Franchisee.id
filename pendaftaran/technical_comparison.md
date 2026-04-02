# Technical Comparison: /pendaftaran/index.html

This document tracks the technical evolution of the registration form, specifically focusing on functions, variables, styles, and structural elements across key commits.

## Version Comparison Summary

| Commit Hash | Logic Type | Key Features | Issues/Observations |
|-------------|------------|--------------|---------------------|
| `10dc93f` | External | Cleaned SEO, moved logic to `js/form-franchise.js` | Significant reduction in HTML size. |
| `362415c` | Hybrid | Integrated Claim Flow, multi-tab validation | Heavy inline styles and boilerplate. |
| `f35ef51` | Hybrid | Initial Claim Flow implementation | First transition to structured logic. |

---

## Detailed Analysis: Version 362415c (1,370 lines)
*This version represents the form before the major SEO and boilerplate cleanup.*

### 1. Global Variables & Configurations
- `astra`: Theme configuration object (break points, header settings).
- `elementorFrontendConfig`: Massive configuration object for Elementor components.
- `wpforms_settings`: Validation messages and localization for WPForms.
- `wpformsElementorVars`: Captcha and integration settings.

### 2. Inline Scripts (Removed in 10dc93f)
- **WP Emoji Release**: Standard WordPress emoji compatibility script.
- **Rank Math Schema**: Large JSON-LD block for SEO (Person, Organization, WebSite, BreadcrumbList, Article).
- **Trident/MSIE Polyfill**: Hashchange listener for old IE browsers.
- **Form Navigation Logic**: (Check if any was moved or lost)

### 3. CSS & Styles
- **Astra Inline CSS**: Massive block (approx 400+ lines) defining the entire site's layout, colors, and typography.
- **Elementor Container Styles**: Variables for global colors and spacing.
- **Custom Form Styles**: Specific styles for `.elementor-icon-list-item`, `.ast-footer-social-wrap`, etc.

### 4. Key HTML Structural Elements
- `id="page"`: Main wrapper.
- `id="masthead"`: Header section.
- `id="primary"`: Content area.
- `class="wpforms-form"`: The core registration form.
- `id="wpforms-2259-field_..."`: Specific input fields for ROI, BEP, and Franchise details.

---

## Detailed Analysis: Version 10dc93f (840 lines)
*The current "Clean" version.*

### 1. Major Changes
- **SEO Cleanup**: Removed Rank Math JSON-LD and meta tags.
- **Style Optimization**: Removed most inline CSS, relying on external stylesheets or theme defaults.
- **Script Externalization**: Logic primarily resides in:
  - `/js/form-utils.js`
  - `/js/form-franchise.js`
- **Library Updates**: Added `https://cdn.jsdelivr.net/npm/sweetalert2@11` for better UI feedback.

### 2. Potential Missing Elements (To be verified)
- **Metadata**: Social sharing (Open Graph) and Twitter cards are gone.
- **Schema**: Rich snippets for Google Search might be degraded.
- **Breadcrumbs**: The BreadcrumbList schema is missing.
- **Legacy Browser Support**: IE-specific polyfills removed.
