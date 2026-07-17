export const FRANCHISE_DIRECTORY_STYLES = `<style id="franchise-directory-generated-css">
.franchise-directory-controls {
  max-width: 1200px;
  margin: 0 auto 16px;
  padding: 14px;
  border: 1px solid #e4e4e4;
  background: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.franchise-directory-intro {
  max-width: 1200px;
  margin: 0 auto 14px;
  padding: 14px 16px;
  border-left: 4px solid #f0ca00;
  background: #fffaf0;
  color: #303030;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.franchise-directory-intro p {
  margin: 0 0 8px;
  color: #303030;
  font-size: 15px;
  line-height: 1.6;
}
.franchise-directory-intro p:last-child {
  margin-bottom: 0;
}
.fr-owner-cta {
  max-width: 1200px;
  margin: 18px auto 0;
  padding: 16px 18px;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(240, 202, 0, 0.38);
  background: #161616;
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.fr-owner-cta__content {
  max-width: 720px;
}
.fr-owner-cta__eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  color: #f0ca00;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.fr-owner-cta h2 {
  margin: 0 0 5px;
  color: #ffffff;
  font-size: 20px;
  line-height: 1.25;
}
.fr-owner-cta p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  line-height: 1.5;
}
.fr-owner-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.fr-owner-cta__primary,
.fr-owner-cta__secondary {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 12px;
  border-radius: 0;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  text-decoration: none !important;
}
.fr-owner-cta__primary {
  border: 1px solid #f0ca00;
  background: #f0ca00;
  color: #111111 !important;
}
.fr-owner-cta__secondary {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff !important;
}
.franchise-directory-control-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto;
  gap: 10px;
  align-items: end;
}
.franchise-directory-controls label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #2b2b2b;
  font-size: 12px;
  font-weight: 700;
}
.franchise-directory-controls input,
.franchise-directory-controls select {
  min-height: 40px;
  width: 100%;
  border: 1px solid #d6d6d6;
  border-radius: 4px;
  padding: 8px 10px;
  background: #ffffff;
  color: #111111;
  font: inherit;
}
.franchise-directory-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.franchise-directory-actions button,
.franchise-directory-actions a {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  text-decoration: none !important;
}
.franchise-directory-actions button {
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
  cursor: pointer;
}
.franchise-directory-actions a {
  border: 1px solid #dedede;
  background: #f7f7f7;
  color: #111111 !important;
}
.franchise-directory-quicklinks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.franchise-directory-quicklinks a {
  border: 1px solid #e3d083;
  border-radius: 999px;
  padding: 6px 10px;
  background: #fff8d7;
  color: #2b2100 !important;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none !important;
}
.franchise-directory-quicklinks a.is-active {
  background: #f0ca00;
  border-color: #c28d00;
  color: #111111 !important;
}
.franchise-directory-result-count {
  margin: 10px 0 0;
  color: #4d4d4d;
  font-size: 13px;
  font-weight: 600;
}
.franchise-directory-empty {
  display: none;
  max-width: 1200px;
  margin: 0 auto 18px;
  padding: 18px;
  border: 1px solid #e3d083;
  border-left: 4px solid #f0ca00;
  background: #fff9df;
  color: #312500;
  gap: 5px;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
}
.franchise-directory-empty strong {
  color: #17120a;
  font-size: 17px;
}
.franchise-directory-empty span {
  font-size: 13px;
  line-height: 1.45;
}
.franchise-directory-empty a {
  width: fit-content;
  min-height: 36px;
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  background: #111111;
  color: #ffffff !important;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none !important;
}
.franchise-css-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 20%, rgba(240, 202, 0, 0.28), transparent 28%),
    linear-gradient(135deg, #111111 0%, #3a3a3a 54%, #f0ca00 100%);
  color: #ffffff;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-size: 34px;
  font-weight: 700;
  text-transform: uppercase;
}
.franchise-css-placeholder span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.22);
}
.franchise-css-placeholder small {
  position: relative;
  z-index: 1;
  display: block;
  max-width: calc(100% - 24px);
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-transform: none;
}
.category-css-placeholder {
  background:
    radial-gradient(circle at 80% 22%, rgba(255, 255, 255, 0.22), transparent 24%),
    linear-gradient(135deg, #f0ca00 0%, #222222 62%, #000000 100%);
}
#uc_post_grid_elementor_d0f4a5f .ue_p_title {
  pointer-events: auto !important;
}
.elementor-2184 .elementor-element.elementor-element-19b8c8c {
  --padding-top: 72px !important;
  --padding-bottom: 44px !important;
  --padding-left: 16px !important;
  --padding-right: 16px !important;
}
.elementor-2184 .elementor-element.elementor-element-19b8c8c .elementor-heading-title {
  font-size: 38px;
  line-height: 1.15;
}
.elementor-2184 .elementor-element.elementor-element-9hd9if8 {
  display: none !important;
}
.elementor-2184 .elementor-element.elementor-element-00e75dc {
  --padding-top: 20px !important;
  --padding-bottom: 56px !important;
  --padding-left: 16px !important;
  --padding-right: 16px !important;
}
#uc_post_grid_elementor_d0f4a5f .uc-items-wrapper {
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)) !important;
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
}
#uc_post_grid_elementor_d0f4a5f .uc_content {
  min-width: 0;
  flex: 1 1 auto;
  padding: 13px !important;
  background: #fafafa !important;
}
#uc_post_grid_elementor_d0f4a5f .uc_content_inner,
#uc_post_grid_elementor_d0f4a5f .uc_content-info-wrapper {
  min-width: 0;
}
#uc_post_grid_elementor_d0f4a5f .uc_post_title,
#uc_post_grid_elementor_d0f4a5f .uc_post_title a,
#uc_post_grid_elementor_d0f4a5f .uc_post_title a > * {
  font-size: 16px !important;
  line-height: 1.25 !important;
}
#uc_post_grid_elementor_d0f4a5f .ue-meta-data {
  gap: 6px !important;
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
  font-size: 11px !important;
  line-height: 1.2 !important;
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
  display: flex !important;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  color: #111111 !important;
  line-height: 1.24;
  text-decoration: none !important;
}
.franchise-card-title:hover {
  color: #c28d00 !important;
}
.franchise-status-badge {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 118px;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  flex: 0 0 auto;
}
.franchise-status-badge:hover,
.franchise-status-badge:focus-within {
  z-index: 30;
}
.franchise-status-verified {
  color: #0f5132;
  background: #d1f1dc;
  border: 1px solid rgba(15, 81, 50, 0.18);
}
.franchise-status-unclaimed {
  color: #6a4a00;
  background: #fff2bd;
  border: 1px solid rgba(194, 141, 0, 0.28);
}
.franchise-status-badge > span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.franchise-card-facts {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.franchise-fact-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 4px;
  background: #f6f6f6;
  color: #222222;
  font-size: 11px;
  line-height: 1.2;
}
.franchise-fact-chip span {
  color: #767676;
}
.franchise-fact-chip strong {
  font-weight: 700;
}
.fr-compare-wrap--card {
  position: absolute;
  left: 52px;
  top: 8px;
  z-index: 6;
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
  width: 36px;
  height: 36px;
  padding: 0;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
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
.fr-compare-floating {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 90;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 13px;
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff !important;
  font-family: Outfit, "DM Sans", Arial, sans-serif;
  font-size: 13px;
  font-weight: 900;
  text-decoration: none !important;
}
.fr-compare-floating.is-visible {
  display: inline-flex;
}
.fr-site-promo-bar {
  position: sticky;
  top: 0;
  z-index: 80;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 9px 16px;
  background: #111111;
  color: #ffffff;
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 14px;
  font-weight: 800;
}
.fr-site-promo-bar a {
  color: #111111 !important;
  background: #f0ca00;
  padding: 5px 9px;
  text-decoration: none !important;
}
@media (max-width: 980px) {
  .fr-owner-cta {
    align-items: flex-start;
    flex-direction: column;
  }
  .fr-owner-cta__actions {
    justify-content: flex-start;
  }
  .franchise-directory-control-row {
    grid-template-columns: 1fr 1fr;
  }
  .franchise-directory-search {
    grid-column: 1 / -1;
  }
  .franchise-directory-actions {
    grid-column: 1 / -1;
  }
}
@media (max-width: 640px) {
  .elementor-2184 .elementor-element.elementor-element-19b8c8c {
    --padding-top: 48px !important;
    --padding-bottom: 30px !important;
  }
  .elementor-2184 .elementor-element.elementor-element-19b8c8c .elementor-heading-title {
    font-size: 30px;
  }
  .elementor-2184 .elementor-element.elementor-element-00e75dc {
    --padding-top: 14px !important;
    --padding-bottom: 40px !important;
    --padding-left: 12px !important;
    --padding-right: 12px !important;
  }
  #uc_post_grid_elementor_d0f4a5f .uc-items-wrapper {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  .fr-owner-cta__actions {
    width: 100%;
  }
  .fr-owner-cta__primary,
  .fr-owner-cta__secondary {
    flex: 1 1 150px;
  }
  .fr-owner-cta h2 {
    font-size: 18px;
  }
  .franchise-directory-controls {
    padding: 12px;
  }
  .franchise-directory-control-row {
    grid-template-columns: 1fr;
  }
}
</style>`;

