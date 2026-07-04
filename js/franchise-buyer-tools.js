(function () {
  var dataNode = document.getElementById("franchise-tool-data");
  if (!dataNode) return;
  var rows = JSON.parse(dataNode.textContent || "[]");
  var budgetInput = document.querySelector("[data-budget-input]");
  var budgetButton = document.querySelector("[data-budget-match]");
  var budgetResult = document.querySelector("[data-budget-result]");
  var bepButton = document.querySelector("[data-bep-calculate]");
  var bepResult = document.querySelector("[data-bep-result]");

  if (budgetButton && budgetInput && budgetResult) {
    budgetButton.addEventListener("click", function () {
      var budget = Number(budgetInput.value || 0);
      if (!budget || budget < 1) {
        budgetResult.innerHTML = '<p>Masukkan budget terlebih dahulu agar rekomendasi bisa ditampilkan.</p>';
        return;
      }
      var matched = rows
        .filter(function (row) { return row.capital > 0 && row.capital <= budget; })
        .sort(function (a, b) { return b.capital - a.capital || a.brand.localeCompare(b.brand, "id-ID"); })
        .slice(0, 6);
      budgetResult.innerHTML = matched.length
        ? '<div class="fr-tool-cards">' + matched.map(card).join("") + '</div>'
        : '<p>Belum ada listing dengan estimasi modal di bawah budget tersebut. Coba naikkan budget atau buka direktori modal.</p>';
      saveBuyerContext({
        source: "budget_matcher",
        budget: budget,
        matched_count: matched.length,
        matched_brand_ids: matched.slice(0, 6).map(function (row) { return row.id; })
      });
    });
  }

  if (bepButton && bepResult) {
    bepButton.addEventListener("click", function () {
      var investment = number("[data-bep-investment]");
      var revenue = number("[data-bep-revenue]");
      var margin = number("[data-bep-margin]");
      var fixed = number("[data-bep-fixed]");
      var monthlyProfit = Math.max(0, (revenue * (margin / 100)) - fixed);
      if (!investment || !revenue || !margin || monthlyProfit <= 0) {
        bepResult.innerHTML = '<p>Isi modal, omzet, margin, dan biaya tetap. Pastikan estimasi laba bulanan lebih besar dari nol.</p>';
        return;
      }
      var months = Math.ceil(investment / monthlyProfit);
      bepResult.innerHTML = '<div class="fr-tool-card"><strong>Estimasi BEP: ' + months + ' bulan</strong><p>Laba bersih simulasi sekitar ' + rupiah(monthlyProfit) + ' per bulan. Gunakan angka ini sebagai simulasi awal, lalu minta rincian resmi dari franchisor.</p></div>';
      saveBuyerContext({
        source: "bep_calculator",
        investment: investment,
        monthly_revenue: revenue,
        net_margin_percent: margin,
        fixed_cost_monthly: fixed,
        estimated_monthly_profit: Math.round(monthlyProfit),
        estimated_bep_months: months
      });
    });
  }

  function card(row) {
    return '<article class="fr-tool-card"><strong>' + escapeHtml(row.brand) + '</strong><p>' +
      escapeHtml(row.category + " - " + row.capitalLabel + " - BEP " + row.bep) +
      '</p><a href="' + escapeAttr(row.href) + '">Lihat detail</a></article>';
  }

  function number(selector) {
    var input = document.querySelector(selector);
    return Number(input && input.value || 0);
  }

  function rupiah(value) {
    try {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
    } catch (_error) {
      return "Rp " + Math.round(value);
    }
  }

  function saveBuyerContext(next) {
    try {
      var current = JSON.parse(localStorage.getItem("franchise_buyer_context") || "{}");
      current.updated_at = new Date().toISOString();
      current.last_tool = next.source || current.last_tool || "";
      if (next.source === "budget_matcher") current.budget_matcher = next;
      if (next.source === "bep_calculator") current.bep_calculator = next;
      localStorage.setItem("franchise_buyer_context", JSON.stringify(current));
    } catch (_error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
}());
