import { buildProposalPdfResponse } from "./_proposal-pdf.js";

export async function onRequestPost({ request, env }) {
  try {
    const input = await request.json();
    return await buildProposalPdfResponse(input, env);
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message || "PDF brosur belum bisa dibuat. Coba lagi nanti.",
    }, { status: 500 });
  }
}

export function onRequestGet() {
  return jsonResponse({ success: false, message: "Gunakan tombol download dari halaman brosur." }, { status: 405 });
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
