const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
const load = file => vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), sandbox);
load('dashboard-utils.js');
sandbox.window.FranchiseDashboardGoogleContacts = {
  create: () => ({ renderConnectedPill: () => '', renderHealthPill: () => '' }),
};
load('dashboard-outreach.js');

const row = {
  id: '1', brand_name: 'Contoh', public_url: '/peluang-usaha/contoh', category: 'Makanan',
  current_status: 'uncontacted', sales_next_action: 'Simpan kontak', sales_next_action_detail: 'Simpan nomor',
  stage_changed_at: '2026-09-24', assigned_staff_user_id: null, publication_status: 'published',
  claim_url: '/claim', contacts: [],
};
const count = { innerHTML: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
const worklist = { innerHTML: '', querySelectorAll: () => [] };
const actions = { innerHTML: '', querySelector: () => null, insertAdjacentHTML(_position, html) { this.innerHTML += html; } };
sandbox.window.FranchiseDashboardOutreach.createOutreach({
  outreachWorklist: worklist, outreachActions: actions, outreachCount: count,
  outreachTabBadge: { textContent: '', hidden: false },
}).render([row], { contact_ready: 1 }, [], {}, { connected: true });

for (const label of ['Simpan kontak', 'No WA', 'Stage', 'New', 'Open', 'published']) {
  assert.match(worklist.innerHTML + actions.innerHTML, new RegExp(`(?:aria-label|data-fr-tooltip)="[^"]*${label}`));
  assert.doesNotMatch(worklist.innerHTML + actions.innerHTML, new RegExp(`>\\s*${label}\\s*<`));
}
assert.match(worklist.innerHTML, /data-fr-tooltip="Simpan kontak: Simpan nomor"/);
assert.match(worklist.innerHTML, /data-outreach-claim/);
assert.match(worklist.innerHTML, /style="grid-column:6"[^>]*aria-label="Open/);
assert.match(worklist.innerHTML, /<select class="dash-outreach-status-select"/);
assert.match(count.innerHTML, /1 \/ 1/);
assert.match(count.attributes['data-fr-tooltip'], /1 tampil dari 1 kontak siap/);

const listeners = {};
const wrap = { hidden: false };
const reason = {
  value: '', focused: false,
  addEventListener(event, handler) { listeners[`reason:${event}`] = handler; },
  closest: () => card,
  focus() { this.focused = true; },
};
const status = {
  tagName: 'SELECT', value: 'uncontacted', disabled: false,
  classList: { contains: () => false, add: () => {}, remove: () => {} },
  addEventListener(event, handler) { listeners[`status:${event}`] = handler; },
  getAttribute(name) { return name === 'data-franchise-id' ? '1' : 'uncontacted'; },
  closest: () => card,
};
const card = {
  querySelector(selector) {
    return {
      '[data-outreach-status-select]': status,
      '[data-outreach-burned-reason]': reason,
      '[data-burned-reason-wrap]': wrap,
    }[selector] || null;
  },
};
const interactiveWorklist = {
  innerHTML: '',
  querySelectorAll(selector) {
    if (selector === '[data-outreach-status-select]') return [status];
    if (selector === '[data-outreach-burned-reason]') return [reason];
    return [];
  },
  querySelector: () => card,
};
const posts = [];
sandbox.window.FranchiseDashboardOutreach.createOutreach({
  outreachWorklist: interactiveWorklist,
  outreachCount: { innerHTML: '', setAttribute: () => {} },
  outreachTabBadge: { textContent: '', hidden: false },
  postDashboardAction: payload => { posts.push(payload); return Promise.resolve({}); },
  reloadDashboard: () => Promise.resolve(),
  setStatus: () => {},
}).render([row], {}, [], {}, {});
assert.equal(wrap.hidden, true);
status.value = 'burned';
listeners['status:change']();
assert.equal(wrap.hidden, false);
assert.equal(reason.focused, true);
assert.equal(posts.length, 0);
reason.value = 'invalid_contact';
listeners['reason:change']();
assert.equal(posts.length, 1);
assert.equal(posts[0].burned_reason, 'invalid_contact');
console.log('Outreach icons, count, and explicit Burned reason flow pass.');
