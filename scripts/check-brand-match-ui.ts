import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

class Element {
  tag: string;
  children: Element[] = [];
  listeners: Record<string, () => void> = {};
  textContent = '';
  className = '';
  href = '';
  hidden = true;
  type = '';
  constructor(tag: string) { this.tag = tag; }
  appendChild(child: Element) { this.children.push(child); return child; }
  replaceChildren() { this.children = []; }
  addEventListener(event: string, callback: () => void) { this.listeners[event] = callback; }
}
function descendants(node: Element): Element[] { return [node, ...node.children.flatMap(descendants)]; }
const notice = new Element('div');
const document = { createElement: (tag: string) => new Element(tag), getElementById: (id: string) => id === 'existing-brand-notice' ? notice : null };
const window = { FranchiseForm: { state: {}, utils: {} }, openTab() {} };
runInNewContext(readFileSync('js/form-02-claim-workflow.js', 'utf8'), { window, document, console });
const FF = window.FranchiseForm as typeof window.FranchiseForm & { renderExistingBrandNotice: (matches: unknown[]) => void; fillMainFranchisorForm: (brand: unknown) => void };
let selected: unknown;
FF.fillMainFranchisorForm = (brand: unknown) => { selected = brand; };
const base = { brand_name: 'Kopi Test', category: 'Minuman', city_origin: 'Bogor', state: 'unclaimed', claim_pending: false, claim_id: 'listing-1', public_url: '/peluang-usaha/kopi-test', ownership_confirmed: false, contact_person: null, contact_phone: null };
FF.renderExistingBrandNotice([base]);
assert.equal(notice.hidden, false);
let controls = descendants(notice);
assert.equal(controls.filter(item => item.tag === 'button').length, 1);
controls.find(item => item.tag === 'button')!.listeners.click();
assert.deepEqual(JSON.parse(JSON.stringify(selected)), { id: 'listing-1', brand_name: 'Kopi Test', category: 'Minuman' });
FF.renderExistingBrandNotice([{ ...base, claim_pending: true, claim_id: null }]);
assert.equal(descendants(notice).filter(item => item.tag === 'button').length, 0);
FF.renderExistingBrandNotice([{ ...base, state: 'managed', claim_id: null, ownership_confirmed: true, contact_person: 'Approved PIC', contact_phone: '0812345' }]);
controls = descendants(notice);
assert.equal(controls.filter(item => item.tag === 'button').length, 0);
assert(controls.some(item => item.textContent.includes('Approved PIC') && item.textContent.includes('0812345')));
FF.renderExistingBrandNotice([{ ...base, state: 'managed', claim_id: null, ownership_confirmed: false, contact_person: null, contact_phone: null, public_url: 'https://elsewhere.test/' }]);
controls = descendants(notice);
assert.equal(controls.filter(item => item.tag === 'a').length, 0);
assert(!controls.some(item => item.textContent.includes('Approved PIC')));
console.log('existing-brand notice actions and contact visibility passed');
