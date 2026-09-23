const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const escape = value => String(value ?? '').replace(/[&"'<>]/g, char => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[char]);
const window = {
  FranchiseDashboardUtils: {
    escapeHtml: escape,
    escapeAttr: escape,
    renderActionToolbar: items => items.join(''),
    renderActionButton: ({ label, icon }) => `<button aria-label="${escape(label)}"><i class="${escape(icon)}"></i></button>`,
    renderActionLink: ({ label, icon }) => `<a aria-label="${escape(label)}"><i class="${escape(icon)}"></i></a>`,
    renderPillActionButton: ({ label }) => `<button>${escape(label)}</button>`,
  },
  FranchiseDashboardGoogleContacts: { create: () => ({ renderConnectedPill: () => '', renderHealthPill: () => '' }) },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/dashboard-outreach.js'), 'utf8'), { window });

const worklist = { innerHTML: '', querySelectorAll: () => [] };
const actions = { innerHTML: '', querySelector: () => null, insertAdjacentHTML(_position, html) { this.innerHTML += html; } };
const outreach = window.FranchiseDashboardOutreach.createOutreach({
  outreachWorklist: worklist,
  outreachActions: actions,
  outreachCount: { textContent: '' },
  outreachTabBadge: { textContent: '', hidden: false },
});
outreach.render([{
  id: '1', brand_name: 'Contoh', public_url: '/peluang-usaha/contoh', category: 'Makanan',
  current_status: 'uncontacted', sales_next_action: 'Simpan kontak', sales_next_action_detail: 'Simpan nomor',
  stage_changed_at: '2026-09-24', assigned_staff_user_id: null, publication_status: 'published',
  claim_url: '/claim', contacts: [],
}], {}, [], {}, { connected: true });

for (const label of ['Simpan kontak', 'No WA', 'Stage', 'New', 'Open', 'published']) {
  assert.match(worklist.innerHTML + actions.innerHTML, new RegExp(`(?:aria-label|data-fr-tooltip)="[^"]*${label}`));
  assert.doesNotMatch(worklist.innerHTML + actions.innerHTML, new RegExp(`>\\s*${label}\\s*<`));
}
assert.match(worklist.innerHTML, /data-fr-tooltip="Simpan kontak: Simpan nomor"/);
assert.match(worklist.innerHTML, /<select class="dash-outreach-status-select"/);
console.log('Outreach row indicators and save action are icon-only with accessible tooltip labels.');
