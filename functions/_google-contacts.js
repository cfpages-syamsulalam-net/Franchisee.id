import { getUnclaimedOutreachQueue } from "./_dashboard-queries.js";
import { getStaffGoogleContactsAccessToken, GOOGLE_CONTACTS_SCOPE, GOOGLE_CONTACTS_SETUP_DOC } from "./_google-contacts-oauth.js";
import { outreachStatusStatement } from "./_outreach-status.js";
import { auditStatement, jsonResponse, randomId } from "./_dashboard-utils.js";

const PEOPLE_BATCH_CREATE_URL = "https://people.googleapis.com/v1/people:batchCreateContacts";
const PEOPLE_CONNECTIONS_URL = "https://people.googleapis.com/v1/people/me/connections";
const MAX_CONTACTS_PER_BATCH = 200;
// Leave room for token refresh and contact creation within the Workers Free subrequest limit.
const MAX_CONNECTION_PAGES = 10;

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
      ...duplicateResult.duplicate_contacts.map((contact) => outreachStatusStatement(db, {
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
      results: contactResultSummary(contacts, duplicateResult.duplicate_contacts, [], []),
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

  const createdPeopleKnown = Array.isArray(result.createdPeople);
  const createdCount = createdPeopleKnown ? result.createdPeople.length : contactsToCreate.length;
  const createdContacts = contactsToCreate.slice(0, createdCount);
  const unconfirmedContacts = createdPeopleKnown ? contactsToCreate.slice(createdCount) : [];
  const savedContacts = [...duplicateResult.duplicate_contacts, ...createdContacts];
  await db.batch([
    ...savedContacts.map((contact) => outreachStatusStatement(db, {
      franchiseId: contact.franchise_id,
      status: "saved_contact",
      staffUserId: auth.id,
      notes: duplicateResult.duplicate_contacts.some((duplicate) => duplicate.franchise_id === contact.franchise_id)
        ? "Kontak sudah ada di Google Contacts."
        : "Kontak disimpan ke Google Contacts.",
    })),
    auditStatement(db, "dashboard.outreach.google_contacts.save", "user", auth.id, {
      requested: contacts.length,
      created: createdCount,
      duplicate_skipped: duplicateResult.duplicate_skipped,
      unconfirmed: unconfirmedContacts.length,
      franchise_ids: contactsToCreate.map((contact) => contact.franchise_id),
    }, auth.id),
  ]);

  return jsonResponse({
    success: true,
    partial_success: unconfirmedContacts.length > 0,
    requested: contacts.length,
    saved: savedContacts.length,
    skipped: contacts.length - savedContacts.length,
    duplicate_skipped: duplicateResult.duplicate_skipped,
    results: contactResultSummary(contacts, duplicateResult.duplicate_contacts, createdContacts, unconfirmedContacts),
    message: unconfirmedContacts.length
      ? "Sebagian kontak berhasil disimpan. Cek detail hasil dan coba ulang untuk kontak yang belum terkonfirmasi."
      : "Kontak outreach berhasil disimpan ke Google Contacts.",
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

export function googleContactsConnectionUrl(pageToken = "") {
  const params = new URLSearchParams({
    personFields: "phoneNumbers",
    pageSize: "1000",
    sources: "READ_SOURCE_TYPE_CONTACT",
  });
  if (pageToken) params.set("pageToken", pageToken);
  return PEOPLE_CONNECTIONS_URL + "?" + params.toString();
}

export async function filterExistingGoogleContacts(token, contacts) {
  const deduped = dedupeContactsByPhone(contacts);
  const remaining = [];
  const duplicateContacts = [...deduped.duplicates];
  const existingPhones = new Set();
  let pageToken = "";

  for (let page = 0; page < MAX_CONNECTION_PAGES; page++) {
    const result = await googlePeopleGet(token, googleContactsConnectionUrl(pageToken));
    if (!result.ok) return result;
    const people = result.body?.connections;
    if (!result.body || typeof result.body !== "object" || Array.isArray(result.body) || (people != null && !Array.isArray(people))) {
      return {
        ok: false,
        error: "GOOGLE_CONTACTS_INVALID_RESPONSE",
        message: "Daftar Google Contacts belum bisa dibaca. Coba lagi nanti.",
        status: 502,
      };
    }
    for (const person of people || []) {
      for (const number of person?.phoneNumbers || []) {
        const digits = normalizePhoneDigits(number?.canonicalForm || number?.value);
        if (digits) existingPhones.add(digits);
      }
    }
    pageToken = result.body.nextPageToken || "";
    if (!pageToken) break;
    if (page === MAX_CONNECTION_PAGES - 1) {
      return {
        ok: false,
        error: "GOOGLE_CONTACTS_LIST_TOO_LARGE",
        message: "Daftar Google Contacts akun ini terlalu besar untuk diperiksa. Hubungi admin untuk bantuan menyimpan kontak outreach.",
        status: 409,
      };
    }
  }

  for (const contact of deduped.unique) {
    if (existingPhones.has(normalizePhoneDigits(contact.phone))) {
      duplicateContacts.push(contact);
    } else {
      remaining.push(contact);
    }
  }
  return {
    ok: true,
    contacts: remaining,
    duplicate_skipped: duplicateContacts.length,
    duplicate_contacts: duplicateContacts,
  };
}
async function googlePeopleGet(token, url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
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
  const duplicates = [];
  for (const contact of contacts) {
    const key = normalizePhoneDigits(contact.phone);
    if (!key || seen.has(key)) {
      duplicates.push(contact);
      continue;
    }
    seen.add(key);
    unique.push(contact);
  }
  return { unique, duplicates };
}

function contactResultSummary(allContacts, duplicateContacts, createdContacts, unconfirmedContacts) {
  const duplicateIds = new Set(duplicateContacts.map((contact) => contact.franchise_id));
  const createdIds = new Set(createdContacts.map((contact) => contact.franchise_id));
  const unconfirmedIds = new Set(unconfirmedContacts.map((contact) => contact.franchise_id));
  return allContacts.map((contact) => ({
    franchise_id: contact.franchise_id,
    name: contact.name,
    phone: contact.phone,
    status: createdIds.has(contact.franchise_id)
      ? "created"
      : duplicateIds.has(contact.franchise_id)
        ? "duplicate"
        : unconfirmedIds.has(contact.franchise_id)
          ? "unconfirmed"
          : "skipped",
  }));
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
