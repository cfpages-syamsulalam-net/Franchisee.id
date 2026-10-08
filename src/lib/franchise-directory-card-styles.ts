export const FRANCHISE_DIRECTORY_CARD_STYLES = `
#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper {
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)) !important;
  gap: 14px !important;
  align-items: stretch;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e5e5;
  background: #ffffff;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_image {
  display: block;
  flex: 0 0 auto;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_image {
  width: 100%;
  height: auto !important;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  background: #ffffff;
  border: 0 !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_image img {
  width: 100%;
  height: 100% !important;
  padding: 10px;
  object-fit: contain !important;
  object-position: center !important;
  transform: none !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_image_overlay {
  display: none;
}
#uc_post_grid_elementor_d0f4a5f .franchise-css-placeholder {
  min-height: 0;
  background: #f1f0ec;
  color: #66645e;
  font-size: 30px;
  font-weight: 600;
}
#uc_post_grid_elementor_d0f4a5f .franchise-css-placeholder span {
  width: auto;
  height: auto;
  border: 0;
  background: none;
}
#uc_post_grid_elementor_d0f4a5f .franchise-css-placeholder small {
  display: none;
}
#uc_post_grid_elementor_d0f4a5f .uc_content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  padding: 13px !important;
  background: #ffffff !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_content_inner,
#uc_post_grid_elementor_d0f4a5f .uc_content-info-wrapper {
  min-width: 0;
}
#uc_post_grid_elementor_d0f4a5f .uc_content_inner {
  flex: 1 1 auto;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_title,
#uc_post_grid_elementor_d0f4a5f .uc_post_title a {
  font-size: 16px !important;
  line-height: 1.25 !important;
}
#uc_post_grid_elementor_d0f4a5f .ue-meta-data {
  gap: 6px !important;
}
#uc_post_grid_elementor_d0f4a5f .ue-grid-item-category,
#uc_post_grid_elementor_d0f4a5f .ue-grid-item-category a {
  padding: 0 !important;
  background: none !important;
  color: #666666 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-decoration: none !important;
}
#uc_post_grid_elementor_d0f4a5f .ue-grid-item-category a:hover {
  text-decoration: underline !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_text {
  min-height: 36px;
  margin-top: 7px !important;
  display: -webkit-box;
  overflow: hidden;
  color: #555555 !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
#uc_post_grid_elementor_d0f4a5f .uc_more_btn {
  margin-top: 9px !important;
  padding: 8px 11px !important;
  font-size: 12px !important;
  line-height: 1.2 !important;
  text-transform: none !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_btn_txt {
  font-size: 12px !important;
  line-height: 1.2 !important;
  text-transform: none !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}
#uc_post_grid_elementor_d0f4a5f .franchise-card-tools {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}
#uc_post_grid_elementor_d0f4a5f,
#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper,
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_wrap,
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item,
#uc_post_grid_elementor_d0f4a5f .uc_content,
#uc_post_grid_elementor_d0f4a5f .uc_content_inner,
#uc_post_grid_elementor_d0f4a5f .uc_post_title {
  overflow: visible !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item {
  position: relative;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item:has(.franchise-status-badge:hover),
#uc_post_grid_elementor_d0f4a5f .uc_post_grid_style_one_item:has(.franchise-status-badge:focus-within) {
  z-index: 20;
}
.franchise-card-title {
  display: block !important;
  color: #111111 !important;
  line-height: 1.24;
  text-decoration: none !important;
}
.franchise-card-title:hover {
  color: #c28d00 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-card-status {
  margin-top: 8px;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: 11px !important;
  line-height: 1.3 !important;
  font-weight: 500 !important;
  white-space: nowrap;
  flex: 0 0 auto;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only {
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  max-width: 22px !important;
  border-radius: 50% !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-unclaimed {
  background: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-unclaimed i {
  color: #64748b !important;
  font-size: 10px !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-verified {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-verified i {
  color: #059669 !important;
  font-size: 10px !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-premium {
  background: #fffbeb !important;
  border-color: #fde68a !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge--icon-only.franchise-status-premium i {
  color: #d97706 !important;
  font-size: 10px !important;
}
.franchise-status-badge:hover,
.franchise-status-badge:focus-within {
  z-index: 30;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-verified,
#uc_post_grid_elementor_d0f4a5f .franchise-status-verified * {
  color: #286547 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-unclaimed,
#uc_post_grid_elementor_d0f4a5f .franchise-status-unclaimed * {
  color: #6a5e46 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge > span {
  overflow: visible;
  text-overflow: clip;
  font-size: 11px !important;
  line-height: 1.3 !important;
}
#uc_post_grid_elementor_d0f4a5f .franchise-status-badge i {
  font-size: 11px !important;
}
.franchise-card-facts {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 5px 8px;
  margin-top: 8px;
}
.franchise-fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.04);
  color: #222222;
  font-size: 11px;
  line-height: 1.4;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.franchise-fact-chip:hover {
  background: #f1f5f9;
  border-color: rgba(0, 0, 0, 0.08);
}
.franchise-fact-chip i {
  color: #c28d00;
  font-size: 10px;
}
#uc_post_grid_elementor_d0f4a5f .franchise-fact-chip,
#uc_post_grid_elementor_d0f4a5f .franchise-fact-chip * {
  font-size: 11px !important;
  line-height: 1.4 !important;
}
.franchise-fact-chip span {
  color: #64748b;
}
.franchise-fact-chip strong {
  font-weight: 700;
  color: #0f172a;
}
.fr-compare-wrap--card {
  position: relative;
  z-index: 6;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-wrap--card {
  position: relative;
  top: auto;
  left: auto;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-wrap--card .fr-save-opportunity-message {
  right: 0;
  left: auto;
}
.fr-compare-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #111111;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-weight: 800;
  cursor: pointer;
}
.fr-compare-button--card {
  width: 34px;
  height: 34px;
  padding: 0;
  box-shadow: none;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card,
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card {
  width: 34px !important;
  height: 34px !important;
  min-height: 34px !important;
  border: 1px solid rgba(17, 24, 39, 0.12) !important;
  background: #ffffff !important;
  color: #c28d00 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
  border-radius: 999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card i {
  color: #c28d00 !important;
  -webkit-text-fill-color: #c28d00 !important;
  font-size: 13px !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card i {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  font-size: 13px !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card:hover,
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card:hover,
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card:focus-visible,
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card:focus-visible {
  background: #c28d00 !important;
  border-color: #c28d00 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(194, 141, 0, 0.3) !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card:hover i,
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card:hover i,
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card:focus-visible i,
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card:focus-visible i {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card.is-saved {
  border-color: #137333 !important;
  background: #137333 !important;
  color: #ffffff !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card.is-saved i {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card.is-added {
  border-color: #c28d00 !important;
  background: #c28d00 !important;
  color: #ffffff !important;
}
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card.is-added i {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
.fr-compare-button--card span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.fr-compare-button--detail {
  min-height: 42px;
  padding: 8px 13px;
}
.fr-compare-button.is-added {
  background: #c28d00;
  color: #ffffff !important;
}
.fr-tooltip {
  font-family: Outfit, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
  font-size: 12px !important;
  font-weight: 400 !important;
  line-height: 1.45 !important;
  letter-spacing: 0.01em !important;
  background: #1e293b !important;
  color: #f8fafc !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
}
.fr-tooltip strong,
.fr-tooltip b {
  font-weight: 600 !important;
  color: #ffffff !important;
}
`;
