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
  gap: 5px 12px;
  margin-top: 8px;
}
.franchise-fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: none;
  color: #222222;
  font-size: 11px;
  line-height: 1.4;
}
#uc_post_grid_elementor_d0f4a5f .franchise-fact-chip,
#uc_post_grid_elementor_d0f4a5f .franchise-fact-chip * {
  font-size: 11px !important;
  line-height: 1.4 !important;
}
.franchise-fact-chip span {
  color: #767676;
}
.franchise-fact-chip strong {
  font-weight: 700;
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
  width: 34px;
  height: 34px;
  min-height: 34px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #333333;
  box-shadow: none;
}
#uc_post_grid_elementor_d0f4a5f .fr-save-opportunity-button--card.is-saved {
  border-color: #137333;
  background: #137333;
  color: #ffffff;
}
#uc_post_grid_elementor_d0f4a5f .fr-compare-button--card.is-added {
  border-color: #f0ca00;
  background: #f0ca00;
  color: #111111;
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
  background: #f0ca00;
  color: #111111;
}
`;
