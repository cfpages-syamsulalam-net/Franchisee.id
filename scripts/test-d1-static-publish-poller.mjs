import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pollerUrls = [
  new URL('../canonical/scripts/d1_static_publish_poller.mjs', import.meta.url),
  new URL('./d1-static-publish-poller.mjs', import.meta.url),
];
const pollerUrl = pollerUrls.find(candidate => existsSync(fileURLToPath(candidate)));
if (!pollerUrl) throw new Error('D1 static publish poller module was not found in source or installed layout');
const { validateConfiguration, run, markDeployed, markFailed, ConflictError } = await import(pollerUrl.href);

const base = { GITHUB_REPOSITORY:'cfpages-admtravelbos/Franchisor.id', SITE_ID:'site_franchisor_id', PAGES_PROJECT_NAME:'franchisor-id', TARGET_REF:'main', GITHUB_REF_TYPE:'branch', GITHUB_REF_NAME:'main', GITHUB_DEFAULT_BRANCH:'main', CLOUDFLARE_ACCOUNT_ID:'0ba63b7f0096bc267a93fe5c80b1f571', CLOUDFLARE_D1_DATABASE_ID:'812cd8ac-edd0-45d9-981f-c9a15358317b', CLOUDFLARE_API_TOKEN:'opaque', DEPLOY_HOOK_URL:'https://hooks.example.test/opaque' };
const response = body => ({ ok:true, status:200, json:async()=>body });

let calls=[];
function fetchMock(url, init) {
  calls.push({url,init});
  const sql = JSON.parse(init.body).sql;
  if (sql.startsWith('SELECT *')) return Promise.resolve(response({success:true,result:[{results:[{site_id:base.SITE_ID,is_enabled:1,daily_publish_limit:10,published_today:0,min_publish_interval_minutes:0,publish_mode:'hook'}],meta:{}}]}));
  if (sql.startsWith('SELECT id')) return Promise.resolve(response({success:true,result:[{results:[{id:2,status:'pending'},{id:5,status:'failed_retryable'}],meta:{}}]}));
  return Promise.resolve(response({success:true,result:[{results:[],meta:{changes:1}}]}));
}

validateConfiguration(base);
const poison = {...base, CLOUDFLARE_ACCOUNT_ID:'wrong'}; let poisonCalls=0;
await assert.rejects(() => run(poison, (...a)=>{poisonCalls++; return fetchMock(...a)})); assert.equal(poisonCalls,0);

calls=[]; const result = await run({...base}, fetchMock);
assert.equal(result.should_call_deploy_hook,true); assert.deepEqual(result.queued_request_ids,['2','5']); assert.equal(calls.length,4);
assert.match(calls[2].init.body,/queued/);

let markCalls=0; await markDeployed(base,['2'],(...a)=>{markCalls++; return fetchMock(...a)}); assert.equal(markCalls,1);
await markFailed(base,['5'],'provider https://secret.invalid\nboom',fetchMock); assert.match(JSON.parse(calls.at(-1).init.body).params[0],/\[redacted\]/);

const conflictFetch = ()=>Promise.resolve(response({success:true,result:[{results:[],meta:{changes:0}}]}));
await assert.rejects(() => markDeployed(base,['9'],conflictFetch), ConflictError);
console.log('poller tests passed');
