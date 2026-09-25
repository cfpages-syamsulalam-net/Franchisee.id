import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { assertActiveD1User, authErrorResponse, markD1UserDeleted, upsertD1User } from "../functions/_clerk-auth.js";

class AuthStatusDb {
  users = new Map<string, any>();

  prepare(sql: string) {
    let values: any[] = [];
    return {
      bind: (...args: any[]) => { values = args; return this.prepareBound(sql, () => values); },
      ...this.prepareBound(sql, () => values),
    } as any;
  }

  private prepareBound(sql: string, getValues: () => any[]) {
    return {
      first: async () => {
        const values = getValues();
        if (sql.includes("WHERE clerk_user_id = ?")) return [...this.users.values()].find((user) => user.clerk_user_id === values[0]) || null;
        if (sql.includes("WHERE lower(primary_email) = ?")) return [...this.users.values()].find((user) => user.primary_email?.toLowerCase() === values[0]) || null;
        return null;
      },
      all: async () => ({ results: [] }),
      run: async () => {
        const values = getValues();
        if (sql.includes("SET status = 'deleted'")) {
          const user = [...this.users.values()].find((candidate) => candidate.clerk_user_id === values[0]);
          if (user) user.status = "deleted";
        } else if (sql.includes("SET primary_email = ?")) {
          const user = this.users.get(values.at(-1));
          user.primary_email = values[0]; user.display_name = values[1];
        } else if (sql.includes("SET clerk_user_id = ?")) {
          const user = this.users.get(values.at(-1));
          user.clerk_user_id = values[0]; user.primary_email = values[1]; user.display_name = values[2];
        } else if (sql.includes("INSERT INTO users")) {
          this.users.set(values[0], { id: values[0], clerk_user_id: values[1], primary_email: values[2], display_name: values[3], status: "active" });
        }
        return {};
      },
    };
  }
}

async function checkAuthStatus() {
  const db = new AuthStatusDb();
  const clerkUser = (id: string) => ({ id, emailAddresses: [{ id: "email1", emailAddress: `${id}@example.invalid`, verification: { status: "verified" } }], primaryEmailAddressId: "email1" });

  const created = await upsertD1User(db as any, clerkUser("new-user"));
  assert.equal(created.status, "active", "new Clerk users start active");
  assertActiveD1User(created);

  db.users.set("suspended-id", { id: "suspended-id", clerk_user_id: "suspended-user", primary_email: "old@example.invalid", display_name: "Old", status: "suspended" });
  const suspended = await upsertD1User(db as any, clerkUser("suspended-user"));
  assert.equal(suspended.status, "suspended", "Clerk sync must preserve suspended status");
  await assert.rejects(async () => assertActiveD1User(suspended), (error: any) => error.code === "ACCOUNT_INACTIVE");

  db.users.set("deleted-id", { id: "deleted-id", clerk_user_id: "deleted-user", primary_email: "old@example.invalid", display_name: "Old", status: "active" });
  await markD1UserDeleted(db as any, "deleted-user");
  const deleted = await upsertD1User(db as any, clerkUser("deleted-user"));
  assert.equal(deleted.status, "deleted", "later Clerk updates must not revive deleted users");
  await assert.rejects(async () => assertActiveD1User(deleted), (error: any) => error.code === "ACCOUNT_INACTIVE");
  console.log("Auth status checks passed: new users are active, suspensions and deletions remain inactive.");
}

async function main() {
  await checkAuthStatus();
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
