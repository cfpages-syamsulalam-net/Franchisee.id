import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/dashboard-account.js', import.meta.url), 'utf8');

function load(signOut) {
  const buttons = ['switch', 'logout'].map(mode => ({
    disabled: false,
    getAttribute: () => mode,
    addEventListener(_event, callback) { this.click = callback; }
  }));
  const actions = { hidden: true, querySelectorAll: () => buttons };
  const destinations = [];
  const status = [];
  let cacheClears = 0;
  const window = {
    FranchiseAuth: { clerk: { signOut } },
    location: { assign: path => destinations.push(path) }
  };
  vm.runInNewContext(source, { window, document: { querySelector: () => actions } });
  window.FranchiseDashboardAccount.configure({
    clearCache: () => { cacheClears += 1; },
    setStatus: (message, isError) => status.push([message, isError])
  });
  return { actions, buttons, destinations, status, get cacheClears() { return cacheClears; }, account: window.FranchiseDashboardAccount };
}

const switching = load(async () => {});
assert.equal(switching.actions.hidden, true);
switching.account.setSession(true);
assert.equal(switching.actions.hidden, false);
await switching.buttons[0].click();
assert.deepEqual(switching.destinations, ['/dashboard/']);
assert.equal(switching.cacheClears, 1);

const leaving = load(async () => {});
await leaving.buttons[1].click();
assert.deepEqual(leaving.destinations, ['/']);
assert.equal(leaving.cacheClears, 1);

const failed = load(async () => { throw new Error('network'); });
failed.account.setSession(true);
await failed.buttons[1].click();
assert.deepEqual(failed.destinations, []);
assert.equal(failed.cacheClears, 0);
assert.equal(failed.status[0][1], true);
assert.ok(failed.buttons.every(button => !button.disabled));
failed.account.setSession(false);
assert.equal(failed.actions.hidden, true);

console.log('Dashboard account actions: OK');
