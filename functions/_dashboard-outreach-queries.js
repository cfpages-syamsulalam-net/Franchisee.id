import { SITE_ID } from "./_dashboard-schemas.js";
import {
  buildWhatsAppUrl,
  normalizeGroupedCounts,
  normalizeNumberObject,
  parseWhatsAppContacts,
} from "./_dashboard-utils.js";
import {
  OUTREACH_PIPELINE_STATUSES,
  outreachPipelineStatusMeta,
  normalizeOutreachPipelineStatus,
} from "../src/lib/outreach-pipeline.js";

const OUTREACH_QUEUE_LIMIT = 250;

export async function getUnclaimedOutreachQueue(db) {
  const result = await db
    .prepare(
      `WITH active_subscriptions AS (
        SELECT franchise_id, MAX(ends_at) AS active_subscription_ends_at
        FROM franchise_subscriptions
        WHERE status = 'active' AND ends_at > CURRENT_TIMESTAMP
        GROUP BY franchise_id
      ),
      latest_subscriptions AS (
        SELECT franchise_id, MAX(ends_at) AS latest_subscription_ends_at
        FROM franchise_subscriptions
        GROUP BY franchise_id
      ),
      claim_state AS (
        SELECT
          franchise_id,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_claim_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_claim_count,
          MAX(created_at) AS latest_claim_at
        FROM franchise_claims
        WHERE source_site_id = ?
        GROUP BY franchise_id
      ),
      pending_orders AS (
        SELECT franchise_id, COUNT(*) AS pending_order_count, MAX(created_at) AS latest_order_at
        FROM premium_orders
        WHERE status IN ('pending_payment', 'confirmation_submitted')
        GROUP BY franchise_id
      )
      SELECT
        f.id,
        p.slug,
        f.brand_name,
        f.category,
        f.status AS listing_status,
        f.verification_tier,
        f.owner_user_id,
        f.phone,
        f.office_address,
        f.total_investment_idr,
        f.min_investment_idr,
        f.updated_at,
        p.publication_status,
        los.status AS outreach_status,
        los.notes AS outreach_notes,
        los.last_status_changed_at,
        los.last_contacted_at,
        los.last_response_at,
        los.last_claimed_at,
        los.last_subscribed_at,
        los.assigned_staff_user_id,
        los.next_follow_up_at,
        los.burned_reason,
        active_subscriptions.active_subscription_ends_at,
        latest_subscriptions.latest_subscription_ends_at,
        claim_state.pending_claim_count,
        claim_state.approved_claim_count,
        claim_state.latest_claim_at,
        pending_orders.pending_order_count,
        pending_orders.latest_order_at,
        MAX(loe.created_at) AS last_outreach_at,
        COUNT(loe.id) AS outreach_count
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN listing_outreach_events loe ON loe.franchise_id = f.id AND loe.site_id = p.site_id
      LEFT JOIN listing_outreach_statuses los ON los.franchise_id = f.id AND los.site_id = p.site_id
      LEFT JOIN active_subscriptions ON active_subscriptions.franchise_id = f.id
      LEFT JOIN latest_subscriptions ON latest_subscriptions.franchise_id = f.id
      LEFT JOIN claim_state ON claim_state.franchise_id = f.id
      LEFT JOIN pending_orders ON pending_orders.franchise_id = f.id
      WHERE p.site_id = ?
        AND COALESCE(p.publication_status, 'draft') != 'archived'
        AND (
          f.source_sheet = 'UNCLAIMED'
          OR f.verification_tier = 'unclaimed'
          OR f.status = 'unclaimed'
          OR f.owner_user_id IS NOT NULL
          OR los.franchise_id IS NOT NULL
          OR active_subscriptions.franchise_id IS NOT NULL
          OR latest_subscriptions.franchise_id IS NOT NULL
        )
        AND COALESCE(f.phone, '') != ''
      GROUP BY f.id, p.slug, p.publication_status
      ORDER BY
        CASE COALESCE(los.status, CASE WHEN active_subscriptions.franchise_id IS NOT NULL THEN 'subscribed' WHEN latest_subscriptions.franchise_id IS NOT NULL THEN 'renewal_risk' ELSE 'uncontacted' END)
          WHEN 'uncontacted' THEN 0
          WHEN 'saved_contact' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'responded' THEN 3
          WHEN 'qualified' THEN 4
          WHEN 'claim_started' THEN 5
          WHEN 'claimed' THEN 6
          WHEN 'subscribed' THEN 7
          WHEN 'renewal_risk' THEN 8
          WHEN 'burned' THEN 9
          ELSE 10
        END,
        CASE WHEN last_outreach_at IS NULL THEN 0 ELSE 1 END,
        f.total_investment_idr DESC,
        f.updated_at DESC
      LIMIT ${OUTREACH_QUEUE_LIMIT}`,
    )
    .bind(SITE_ID, SITE_ID)
    .all();

  return (result.results || []).map((row) => {
    const contacts = parseWhatsAppContacts(row.phone);
    const defaultStatus = defaultOutreachStatus(row);
    const currentStatus = normalizeOutreachPipelineStatus(row.outreach_status, defaultStatus);
    const effectiveStatus = effectiveOutreachStatus(currentStatus, row);
    const stageMeta = outreachPipelineStatusMeta(effectiveStatus);
    const overdue = isOutreachOverdue(row.next_follow_up_at, effectiveStatus);
    return {
      ...row,
      current_status: effectiveStatus,
      status_badge: effectiveStatus,
      subscription_health: row.active_subscription_ends_at ? "active" : row.latest_subscription_ends_at ? "not_active" : "none",
      sales_next_action: stageMeta.next_action || "",
      sales_next_action_detail: nextActionDetail(stageMeta, row, effectiveStatus),
      sales_reason: salesReason(row, effectiveStatus),
      is_overdue: overdue,
      overdue_label: overdue ? overdueLabel(row.next_follow_up_at) : "",
      urgency_rank: urgencyRank(row, effectiveStatus, overdue),
      public_url: `/peluang-usaha/${row.slug}`,
      claim_url: `/daftar?claim=${row.slug}`,
      contacts,
      primary_whatsapp_url: contacts[0] ? buildWhatsAppUrl(contacts[0].international_digits, row) : "",
    };
  }).sort((left, right) => {
    const urgencyDiff = Number(left.urgency_rank || 0) - Number(right.urgency_rank || 0);
    if (urgencyDiff) return urgencyDiff;
    return String(left.next_follow_up_at || left.updated_at || "").localeCompare(String(right.next_follow_up_at || right.updated_at || ""));
  });
}

export async function getUnclaimedOutreachSummary(db) {
  const [row, statusRows] = await Promise.all([
    db
      .prepare(
        `SELECT
          COUNT(*) AS published_unclaimed,
          SUM(CASE WHEN COALESCE(f.phone, '') != '' THEN 1 ELSE 0 END) AS contact_ready,
          SUM(CASE WHEN COALESCE(f.phone, '') = '' THEN 1 ELSE 0 END) AS missing_phone
        FROM franchise_site_publications p
        JOIN franchises f ON f.id = p.franchise_id
        WHERE p.site_id = ?
          AND COALESCE(p.publication_status, 'draft') != 'archived'
          AND (
            f.source_sheet = 'UNCLAIMED'
            OR f.verification_tier = 'unclaimed'
            OR f.status = 'unclaimed'
            OR f.owner_user_id IS NOT NULL
          )`,
      )
      .bind(SITE_ID)
      .first(),
    safeAll(
      db,
      `WITH active_subscriptions AS (
        SELECT franchise_id
        FROM franchise_subscriptions
        WHERE status = 'active' AND ends_at > CURRENT_TIMESTAMP
        GROUP BY franchise_id
      ),
      latest_subscriptions AS (
        SELECT franchise_id
        FROM franchise_subscriptions
        GROUP BY franchise_id
      )
      SELECT
        CASE
          WHEN los.status = 'burned' THEN 'burned'
          WHEN active_subscriptions.franchise_id IS NOT NULL THEN 'subscribed'
          WHEN latest_subscriptions.franchise_id IS NOT NULL AND COALESCE(los.status, '') IN ('', 'subscribed', 'claimed') THEN 'renewal_risk'
          ELSE COALESCE(los.status, 'uncontacted')
        END AS status,
        COUNT(*) AS count
      FROM franchise_site_publications p
      JOIN franchises f ON f.id = p.franchise_id
      LEFT JOIN listing_outreach_statuses los ON los.franchise_id = f.id AND los.site_id = p.site_id
      LEFT JOIN active_subscriptions ON active_subscriptions.franchise_id = f.id
      LEFT JOIN latest_subscriptions ON latest_subscriptions.franchise_id = f.id
      WHERE p.site_id = ?
        AND COALESCE(p.publication_status, 'draft') != 'archived'
        AND COALESCE(f.phone, '') != ''
        AND (
          f.source_sheet = 'UNCLAIMED'
          OR f.verification_tier = 'unclaimed'
          OR f.status = 'unclaimed'
          OR f.owner_user_id IS NOT NULL
          OR los.franchise_id IS NOT NULL
          OR active_subscriptions.franchise_id IS NOT NULL
          OR latest_subscriptions.franchise_id IS NOT NULL
        )
      GROUP BY status`,
      [SITE_ID],
    ),
  ]);

  const counts = normalizeGroupedCounts(statusRows || [], "status");
  return {
    ...normalizeNumberObject(row),
    by_pipeline_status: counts,
    conversion_metrics: outreachConversionMetrics(counts),
    queue_limit: OUTREACH_QUEUE_LIMIT,
  };
}

function defaultOutreachStatus(row) {
  if (row.active_subscription_ends_at) return "subscribed";
  if (row.latest_subscription_ends_at) return "renewal_risk";
  if (Number(row.pending_claim_count || 0) > 0) return "claim_started";
  if (row.owner_user_id || Number(row.approved_claim_count || 0) > 0) return "claimed";
  return "uncontacted";
}

function effectiveOutreachStatus(status, row) {
  if (status === "burned") return "burned";
  if (row.active_subscription_ends_at) return "subscribed";
  if (row.latest_subscription_ends_at && ["subscribed", "claimed", "uncontacted"].includes(status)) return "renewal_risk";
  if (Number(row.pending_claim_count || 0) > 0 && ["uncontacted", "saved_contact", "contacted", "responded", "qualified"].includes(status)) return "claim_started";
  if ((row.owner_user_id || Number(row.approved_claim_count || 0) > 0) && ["uncontacted", "saved_contact", "contacted", "responded", "qualified", "claim_started"].includes(status)) return "claimed";
  return status;
}

function nextActionDetail(meta, row, status) {
  if (status === "claim_started" && Number(row.pending_claim_count || 0) > 0) return "Klaim sudah masuk. Cek bukti, bantu admin menyelesaikan review, dan follow-up brand jika data kurang.";
  if (status === "claimed" && Number(row.pending_order_count || 0) > 0) return "Brand sudah membuat order Premium. Cek konfirmasi pembayaran dan bantu sampai subscription aktif.";
  if (status === "subscribed" && row.active_subscription_ends_at) return `Subscription aktif sampai ${row.active_subscription_ends_at}. Siapkan renewal sebelum masa aktif habis.`;
  if (status === "renewal_risk" && row.latest_subscription_ends_at) return `Subscription terakhir berakhir ${row.latest_subscription_ends_at}. Hubungi owner untuk recovery atau catat alasan burned.`;
  return meta.next_action_detail || "";
}

function salesReason(row, status) {
  if (status === "subscribed") return "Subscription aktif terdeteksi.";
  if (status === "renewal_risk") return row.latest_subscription_ends_at ? "Subscription tidak aktif atau mendekati risiko renewal." : "Perlu follow-up renewal.";
  if (status === "claim_started") return Number(row.pending_claim_count || 0) > 0 ? "Ada klaim pending." : "Status pipeline menunjukkan klaim sedang berjalan.";
  if (status === "claimed") return row.owner_user_id ? "Listing sudah punya owner." : "Klaim pernah disetujui.";
  if (status === "burned") return row.burned_reason ? `Ditutup: ${row.burned_reason}.` : "Ditutup dari pipeline aktif.";
  if (row.last_outreach_at) return `Outreach terakhir ${row.last_outreach_at}.`;
  return "Kontak siap tetapi belum ada aksi yang tercatat.";
}

function isOutreachOverdue(nextFollowUpAt, status) {
  if (!nextFollowUpAt || ["subscribed", "burned"].includes(status)) return false;
  const due = new Date(nextFollowUpAt);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function overdueLabel(nextFollowUpAt) {
  const due = new Date(nextFollowUpAt);
  if (Number.isNaN(due.getTime())) return "Overdue";
  const days = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
  return days <= 0 ? "Jatuh tempo hari ini" : `Terlambat ${days} hari`;
}

function urgencyRank(row, status, overdue) {
  if (overdue) return 0;
  if (status === "renewal_risk") return 1;
  if (Number(row.pending_claim_count || 0) > 0) return 2;
  if (status === "responded") return 3;
  if (status === "qualified") return 4;
  if (status === "uncontacted" || status === "saved_contact") return 5;
  if (status === "subscribed") return 8;
  if (status === "burned") return 9;
  return 6;
}

function outreachConversionMetrics(counts) {
  const count = (key) => Number(counts[key] || 0);
  const contacted = count("contacted") + count("responded") + count("qualified") + count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const responded = count("responded") + count("qualified") + count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const claimTrack = count("claim_started") + count("claimed") + count("subscribed") + count("renewal_risk");
  const claimed = count("claimed") + count("subscribed") + count("renewal_risk");
  const subscribed = count("subscribed");
  const renewalRisk = count("renewal_risk");
  return {
    response_rate: ratio(responded, contacted),
    response_to_claim_rate: ratio(claimTrack, responded),
    claim_to_subscription_rate: ratio(subscribed, claimed),
    renewal_recovery_rate: ratio(subscribed, subscribed + renewalRisk),
    actionable_open: OUTREACH_PIPELINE_STATUSES
      .filter((status) => !["subscribed", "burned"].includes(status.value))
      .reduce((sum, status) => sum + count(status.value), 0),
  };
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

async function safeAll(db, sql, bindings = []) {
  try {
    const statement = db.prepare(sql);
    const result = await (bindings.length ? statement.bind(...bindings).all() : statement.all());
    return result.results || [];
  } catch (_error) {
    return [];
  }
}
