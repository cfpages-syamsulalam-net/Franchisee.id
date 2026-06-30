import { createClerkClient } from "@clerk/backend";
import { syncClerkMetadataForD1User, syncClerkMetadataFromD1 } from "./_clerk-auth.js";
import { auditStatement, getPrimaryEmail, jsonResponse, randomId, splitDisplayName } from "./_profile-utils.js";
import { SITE_FRANCHISEE_ID } from "./_site-publish-queue.js";

export async function updateAccount(env, db, actor, data) {
  const nextEmail = data.email.toLowerCase();
  const currentEmail = (actor.primary_email || getPrimaryEmail(actor.clerk_user) || "").toLowerCase();
  const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const nameParts = splitDisplayName(data.display_name);

  let clerkUser = await clerk.users.updateUser(actor.clerk_user_id, {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
  });

  if (nextEmail !== currentEmail) {
    if (typeof clerk.users.replaceUserEmailAddress !== "function") {
      throw new Error("Perubahan email belum tersedia. Coba ubah nama terlebih dahulu, atau hubungi tim kami.");
    }
    await clerk.users.replaceUserEmailAddress(actor.clerk_user_id, { emailAddress: nextEmail });
    clerkUser = await clerk.users.getUser(actor.clerk_user_id);
  }

  await db.batch([
    db
      .prepare("UPDATE users SET primary_email = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(nextEmail, data.display_name, actor.id),
    db
      .prepare("UPDATE franchisee_profiles SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
      .bind(data.display_name, nextEmail, actor.id),
    db
      .prepare("UPDATE franchisor_profiles SET pic_name = ?, email_contact = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?")
      .bind(data.display_name, nextEmail, actor.id),
    auditStatement(db, "profile.account.update", "users", actor.id, { email_changed: nextEmail !== currentEmail }, actor.id),
  ]);

  const updatedUser = {
    id: actor.id,
    clerk_user_id: actor.clerk_user_id,
    primary_email: nextEmail,
    display_name: data.display_name,
    status: actor.status || "active",
  };
  await syncClerkMetadataFromD1(env, updatedUser, actor.roles || []);

  return jsonResponse({
    success: true,
    user: {
      id: actor.id,
      email: getPrimaryEmail(clerkUser) || nextEmail,
      display_name: data.display_name,
      roles: (actor.roles || []).map((role) => role.role).filter(Boolean),
    },
  });
}

export async function addPublicRole(env, db, actor, data, loadProfileData) {
  const currentRoles = new Set((actor.roles || []).map((row) => row.role));
  if (currentRoles.has("admin") || currentRoles.has("staff")) {
    return jsonResponse({ success: false, message: "Akses ini sudah tersedia untuk akun Anda." }, { status: 400 });
  }
  if (currentRoles.has(data.role)) {
    return jsonResponse({ success: true, already_has_role: true, role: data.role, profile: await loadProfileData(db, actor) });
  }

  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO user_roles (id, user_id, role, scope_type, scope_id, site_id, assigned_by_user_id)
         VALUES (?, ?, ?, 'network', 'network', ?, ?)`,
      )
      .bind(`role_${randomId()}`, actor.id, data.role, SITE_FRANCHISEE_ID, actor.id),
    auditStatement(db, "profile.role.add", "users", actor.id, { role: data.role, source: "profile" }, actor.id),
  ]);

  const synced = await syncClerkMetadataForD1User(env, db, {
    id: actor.id,
    clerk_user_id: actor.clerk_user_id,
    primary_email: actor.primary_email,
    display_name: actor.display_name,
    status: actor.status || "active",
  });

  return jsonResponse({
    success: true,
    role: data.role,
    profile: await loadProfileData(db, { ...actor, roles: synced.roles || [] }),
  });
}
