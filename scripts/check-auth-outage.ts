import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { authErrorResponse } from "../functions/_clerk-auth.js";

async function main() {
  const unavailable = authErrorResponse(new Error("D1_ERROR: Your account has exceeded daily row read limit"));
  assert.ok(unavailable);
  assert.equal(unavailable.status, 503);
  const body = await unavailable.json();
  assert.equal(body.error, "ACCOUNT_DATA_UNAVAILABLE");
  assert.ok(!JSON.stringify(body).includes("D1_ERROR"));
  assert.equal(authErrorResponse(new Error("unrelated")), null);
  const store = new Map();
  const clerk = { session: { id: "session1", getToken: async () => "test-token" }, user: { fullName: "Test", primaryEmailAddress: {emailAddress:"test@example.invalid"} }, load: async () => {} };
  let mode = "outage";
  const context: any = { URL, URLSearchParams, console, Set, Date, Error, TypeError,
    sessionStorage: { getItem: (k: string) => store.get(k), setItem: (k: string,v: string) => store.set(k,v), removeItem: (k: string) => store.delete(k) },
    document: {querySelectorAll: () => [], title: "Test"},
    fetch: async (url: string) => {
      if(url === "/auth-config") return {ok:true, status:200, json:async()=>({configured:true})};
      if(mode === "network") throw new TypeError("Failed to fetch");
      return { ok: mode === "ok", status: mode === "ok" ? 200 : mode === "forbidden" ? 403 : 503,
        json: async()=> mode === "ok" ? {success:true,user:{roles:["staff"]}} : {success:false,error:mode === "forbidden" ? "ROLE_FORBIDDEN" : "ACCOUNT_DATA_UNAVAILABLE",message:"Unavailable"} };
    }
  };
  context.window = {Clerk:clerk, location:{href:"https://example.invalid/login/",origin:"https://example.invalid",pathname:"/login/",search:"",hash:""},
    FranchiseFetch:{readJson:(r: any)=>r.json()},
    FranchiseAuthDebug:{create:()=>new Proxy({}, {get:(_,k)=> k === "initEvents" ? ()=>[] : ()=>""})} };
  vm.runInNewContext(readFileSync("js/auth-clerk-core.js","utf8"),context);
  const auth: any = {}; const core=context.window.FranchiseAuthCore.create(auth);
  const fallback=await core.syncSessionUser("franchisee");
  assert.equal(fallback.sync_pending,true);assert.equal(fallback.roles.length,0);
  assert.equal(store.get("franchise_auth_pending_role"),"franchisee");
  await assert.rejects(core.syncUser()); // protected consumers remain strict
  mode="forbidden";await assert.rejects(core.syncSessionUser());
  mode="network";assert.equal((await core.syncSessionUser()).sync_pending,true);
  mode="ok";assert.equal((await core.syncSessionUser()).roles[0],"staff");
  assert.equal(store.has("franchise_auth_pending_role"),false);
  console.log("Outage checks passed: Clerk session preserved, no fallback roles, strict sync fails, pending registration recovers.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
