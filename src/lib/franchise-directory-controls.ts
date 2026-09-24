import { getCapitalSummaries } from "./franchise-capital";
import { getCategorySummaries } from "./franchise-category";
import { getCityFilterOptions } from "./franchise-city";
import type { DirectoryPageOptions } from "./franchise-directory-types";
import type { D1FranchiseRow } from "./shared-schemas";
import { escapeAttr, escapeHtml } from "./franchise-text";

export function generateDirectoryControls(rows: D1FranchiseRow[], options: DirectoryPageOptions) {
  const categoryOptions = getCategorySummaries(rows)
    .map((item) => `<option value="${escapeAttr(item.slug)}">${escapeHtml(item.label)} (${item.count})</option>`)
    .join("");
  const cityOptions = getCityFilterOptions(rows)
    .map((item) => `<option value="${escapeAttr(item.slug)}">${escapeHtml(item.label)} (${item.count})</option>`)
    .join("");
  const capitalOptions = getCapitalSummaries(rows)
    .map((item) => `<option value="${escapeAttr(item.slug)}">${escapeHtml(item.shortLabel)} (${item.count})</option>`)
    .join("");

  return `
    <form class="franchise-directory-controls" id="franchise-directory-controls" action="${escapeAttr(options.canonicalPath)}" method="get" data-directory-controls data-directory-path="${escapeAttr(options.canonicalPath)}">
      <div class="franchise-directory-control-row">
        <label class="franchise-directory-search">
          <span class="franchise-directory-label"><i class="fas fa-search" aria-hidden="true"></i>Cari franchise</span>
          <input type="search" name="q" placeholder="Nama brand, kategori, atau kata kunci">
        </label>
        <label>
          <span class="franchise-directory-label"><i class="fas fa-tags" aria-hidden="true"></i>Kategori</span>
          <select name="kategori"><option value="">Semua kategori</option>${categoryOptions}</select>
        </label>
        <label>
          <span class="franchise-directory-label"><i class="fas fa-map-marker-alt" aria-hidden="true"></i>Kota <span class="franchise-directory-info" tabindex="0" role="note" aria-label="Kota berdasarkan lokasi yang tercatat; hubungi brand untuk memastikan area kemitraan." data-fr-tooltip="Kota dari lokasi yang tercatat; hubungi brand untuk memastikan area kemitraan."><i class="fas fa-info-circle" aria-hidden="true"></i></span></span>
          <select name="kota"><option value="">Semua kota</option>${cityOptions}</select>
        </label>
        <label>
          <span class="franchise-directory-label"><i class="fas fa-wallet" aria-hidden="true"></i>Modal</span>
          <select name="modal"><option value="">Semua modal</option>${capitalOptions}</select>
        </label>
        <label>
          <span class="franchise-directory-label"><i class="fas fa-check-circle" aria-hidden="true"></i>Status</span>
          <select name="status">
            <option value="">Semua status</option>
            <option value="verified">Terverifikasi</option>
            <option value="premium">Premium</option>
            <option value="unclaimed">Belum diklaim</option>
          </select>
        </label>
        <label>
          <span class="franchise-directory-label"><i class="fas fa-sort" aria-hidden="true"></i>Urutkan</span>
          <select name="sort">
            <option value="">Urutan bawaan</option>
            <option value="rekomendasi">Rekomendasi</option>
            <option value="populer">Populer</option>
            <option value="abjad">A-Z</option>
            <option value="kategori">Kategori</option>
            <option value="modal-asc">Modal terendah</option>
            <option value="modal-desc">Modal tertinggi</option>
          </select>
        </label>
      </div>
      <div class="franchise-directory-bottom-row">
        <div class="franchise-directory-actions">
          <button type="submit">Terapkan</button>
          <a href="/peluang-usaha" data-directory-reset>Reset</a>
        </div>
        <p class="franchise-directory-result-count" aria-live="polite"></p>
        <nav class="franchise-directory-tools" aria-label="Alat bantu">
          <a href="/alat-franchise/"><i class="fas fa-calculator" aria-hidden="true"></i>Budget &amp; BEP</a>
          <a href="/bandingkan"><i class="fas fa-balance-scale" aria-hidden="true"></i>Bandingkan</a>
        </nav>
      </div>
      <noscript><p class="franchise-directory-noscript">Untuk memilih berdasarkan lokasi atau modal, buka <a href="/peluang-usaha/kota/">daftar kota</a> atau <a href="/peluang-usaha/modal/">daftar modal</a>.</p></noscript>
    </form>`;
}
