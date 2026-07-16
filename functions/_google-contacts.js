import { getUnclaimedOutreachQueue } from "./_dashboard-queries.js";
import { getStaffGoogleContactsAccessToken, GOOGLE_CONTACTS_SCOPE, GOOGLE_CONTACTS_SETUP_DOC } from "./_google-contacts-oauth.js";
import { outreachStatusStatement } from "./_outreach-status.js";
import { auditStatement, jsonResponse, randomId } from "./_dashboard-utils.js";

const PEOPLE_BATCH_CREATE_URL = "https://people.googleapis.com/v1/people:batchCreateContacts";
const PEOPLE_SEARCH_CONTACTS_URL = "https://people.googleapis.com/v1/people:searchContacts";
const MAX_CONTACTS_PER_BATCH = 200;

export async function handleSaveOutreachGoogleContacts(db, auth, data, env) {
  const rows = await getUnclaimedOutreachQueue(db);
  const requestedIds = new Set((data.franchise_ids || []).filter(Boolean));
  const selectedRows = requestedIds.size ? rows.filter((row) => requestedIds.has(row.id)) : rows;
  const contacts = selectedRows
    .slice(0, data.limit || MAX_CONTACTS_PER_BATCH)
    .map(outreachRowToGoogleContact)
    .filter(Boolean);

  if (!contacts.length) {
    return jsonResponse({ success: false, error: "NO_CONTACTS_READY", message: "Belum ada kontak WhatsApp yang siap disimpan." }, { status: 400 });
  }

  const tokenResult = await getStaffGoogleContactsAccessToken(db, auth, env);
  if (!tokenResult.token) {
    return jsonResponse({
      success: false,
      error: tokenResult.error,
      message: tokenResult.message,
      setup_required: true,
      connect_required: tokenResult.connect_required || false,
      reauth_required: tokenResult.reauth_required || tokenResult.error === "GOOGLE_CONTACTS_SCOPE_MISSING" || tokenResult.error === "GOOGLE_ACCOUNT_NOT_LINKED",
      required_scope: GOOGLE_CONTACTS_SCOPE,
      documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
    }, { status: tokenResult.status || 409 });
  }

  const duplicateResult = await filterExistingGoogleContacts(tokenResult.token, contacts);
  if (!duplicateResult.ok) {
    return jsonResponse({
      success: false,
      error: duplicateResult.error,
      message: duplicateResult.message,
      setup_required: duplicateResult.status === 409,
      reauth_required: duplicateResult.status === 409,
      required_scope: duplicateResult.status === 409 ? GOOGLE_CONTACTS_SCOPE : undefined,
      documentation_url: duplicateResult.status === 409 ? GOOGLE_CONTACTS_SETUP_DOC : undefined,
      provider_status: duplicateResult.provider_status,
    }, { status: duplicateResult.status || 502 });
  }

  const contactsToCreate = duplicateResult.contacts;
  if (!contactsToCreate.length) {
    await db.batch([
      ...contacts.map((contact) => outreachStatusStatement(db, {
        franchiseId: contact.franchise_id,
        status: "saved_contact",
        staffUserId: auth.id,
        notes: "Kontak sudah ada di Google Contacts.",
      })),
      auditStatement(db, "dashboard.outreach.google_contacts.skip_duplicates", "user", auth.id, {
        requested: contacts.length,
        duplicate_skipped: duplicateResult.duplicate_skipped,
      }, auth.id),
    ]);
    return jsonResponse({
      success: true,
      requested: contacts.length,
      saved: 0,
      skipped: contacts.length,
      duplicate_skipped: duplicateResult.duplicate_skipped,
      message: "Semua kontak outreach sudah ada di Google Contacts akun ini.",
    });
  }

  const payload = buildGoogleBatchCreatePayload(contactsToCreate);
  const response = await fetch(PEOPLE_BATCH_CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? 409 : 502;
    return jsonResponse({
      success: false,
      error: response.status === 403 ? "GOOGLE_CONTACTS_SCOPE_MISSING" : "GOOGLE_CONTACTS_SAVE_FAILED",
      message: googleContactsErrorMessage(response.status, result),
      setup_required: response.status === 401 || response.status === 403,
      reauth_required: response.status === 401 || response.status === 403,
      required_scope: GOOGLE_CONTACTS_SCOPE,
      documentation_url: GOOGLE_CONTACTS_SETUP_DOC,
      provider_status: response.status,
    }, { status });
  }

  const createdCount = Array.isArray(result.createdPeople) ? result.createdPeople.length : contactsToCreate.length;
  await db.batch([
    ...contacts.map((contact) => outreachStatusStatement(db, {
      franchiseId: contact.franchise_id,
      status: "saved_contact",
      staffUserId: auth.id,
      notes: "Kontak disimpan ke Google Contacts.",
    })),
    auditStatement(db, "dashboard.outreach.google_contacts.save", "user", auth.id, {
      requested: contacts.length,
      created: createdCount,
      duplicate_skipped: duplicateResult.duplicate_skipped,
      franchise_ids: contactsToCreate.map((contact) => contact.franchise_id),
    }, auth.id),
  ]);

  return jsonResponse({
    success: true,
    requested: contacts.length,
    saved: createdCount,
    skipped: contacts.length - createdCount,
    duplicate_skipped: duplicateResult.duplicate_skipped,
  });
}

export function outreachRowToGoogleContact(row) {
  const contact = row?.contacts && row.contacts[0];
  if (!row || !contact || !contact.international_digits || !row.brand_name) return null;
  return {
    id: `contact_${randomId()}`,
    franchise_id: row.id,
    name: row.brand_name,
    phone: `+${contact.international_digits}`,
    category: row.category || "",
    public_url: row.public_url ? `https://franchisee.id${row.public_url}` : "",
  };
}

export function buildGoogleBatchCreatePayload(contacts) {
  return {
    contacts: contacts.slice(0, MAX_CONTACTS_PER_BATCH).map((contact) => ({
      contactPerson: {
        names: [{ unstructuredName: contact.name }],
        phoneNumbers: [{ value: contact.phone, type: "mobile" }],
        organizations: [{ name: "Franchisee.id", title: contact.category || "Franchisor" }],
        urls: contact.public_url ? [{ value: contact.public_url, type: "work" }] : [],
      },
    })),
    readMask: "names,phoneNumbers",
  };
}

export function googleContactHasPhone(person, phone) {
  const wanted = normalizePhoneDigits(phone);
  if (!wanted) return false;
  return (person?.phoneNumbers || []).some((item) => {
    const value = normalizePhoneDigits(item?.canonicalForm || item?.value || "");
    return value && value === wanted;
  });
}

export function googleContactSearchUrl(query) {
  const params = new URLSearchParams({
    query,
    pageSize: "10",
    readMask: "names,phoneNumbers",
  });
  return `${PEOPLE_SEARCH_CONTACTS_URL}?${params.toString()}`;
}

async function filterExistingGoogleContacts(token, contacts) {
  const uniqueContacts = dedupeContactsByPhone(contacts);
  const remaining = [];
  let duplicateSkipped = contacts.length - uniqueContacts.length;

  const warmup = await googlePeopleGet(token, googleContactSearchUrl(""));
  if (!warmup.ok) return warmup;

  for (const contact of uniqueContacts) {
    const search = await searchGoogleContactByPhone(token, contact.phone);
    if (!search.ok) return search;
    if (search.exists) {
      duplicateSkipped += 1;
    } else {
      remaining.push(contact);
    }
  }

  return {
    ok: true,
    contacts: remaining,
    duplicate_skipped: duplicateSkipped,
  };
}

async function searchGoogleContactByPhone(token, phone) {
  for (const query of phoneSearchQueries(phone)) {
    const search = await googlePeopleGet(token, googleContactSearchUrl(query));
    if (!search.ok) return search;
    const people = Array.isArray(search.body?.results) ? search.body.results.map((item) => item.person).filter(Boolean) : [];
    if (people.some((person) => googleContactHasPhone(person, phone))) {
      return { ok: true, exists: true };
    }
  }
  return { ok: true, exists: false };
}

function phoneSearchQueries(phone) {
  const digits = normalizePhoneDigits(phone);
  const queries = [phone];
  if (/^62\d{8,13}$/.test(digits)) queries.push(`0${digits.slice(2)}`);
  return [...new Set(queries.filter(Boolean))];
}

async function googlePeopleGet(token, url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, body };
  return {
    ok: false,
    error: response.status === 403 ? "GOOGLE_CONTACTS_SCOPE_MISSING" : "GOOGLE_CONTACTS_DUPLICATE_CHECK_FAILED",
    message: googleContactsSearchErrorMessage(response.status, body),
    provider_status: response.status,
    status: response.status === 401 || response.status === 403 ? 409 : 502,
  };
}

function dedupeContactsByPhone(contacts) {
  const seen = new Set();
  const unique = [];
  for (const contact of contacts) {
    const key = normalizePhoneDigits(contact.phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(contact);
  }
  return unique;
}

function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0\d{8,13}$/.test(digits)) return `62${digits.slice(1)}`;
  return digits;
}

function googleContactsErrorMessage(status, result) {
  const providerMessage = result?.error?.message || result?.message || "";
  if (status === 401) return "Sesi Google Contacts sudah kedaluwarsa. Hubungkan Google Contacts ulang dari tab Outreach, kemudian coba lagi.";
  if (status === 403) return "Koneksi Google Contacts staff belum membawa izin kontak. Hubungkan Google Contacts ulang dari tab Outreach; jika masih gagal, cek People API di panduan.";
  if (providerMessage) return providerMessage;
  return "Kontak belum bisa disimpan ke Google. Coba lagi setelah konfigurasi Google Contacts dicek.";
}

function googleContactsSearchErrorMessage(status, result) {
  const providerMessage = result?.error?.message || result?.message || "";
  if (status === 401) return "Sesi Google Contacts untuk membaca kontak sudah kedaluwarsa. Hubungkan Google Contacts ulang dari tab Outreach, kemudian coba lagi.";
  if (status === 403) return "Koneksi Google Contacts staff belum membawa izin membaca kontak. Hubungkan Google Contacts ulang dari tab Outreach; jika masih gagal, cek People API di panduan.";
  if (providerMessage) return providerMessage;
  return "Pengecekan duplikat Google Contacts gagal. Kontak belum dibuat agar tidak menambah duplikat.";
}
