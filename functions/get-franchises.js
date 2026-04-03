// /functions/get-franchises.js
export async function onRequestGet({ request, env }) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || "FRANCHISOR"; // Nama Tab: FRANCHISOR atau UNCLAIMED
    const purpose = searchParams.get('purpose') || '';
    
    // 1. Auth Google (Reuse Logic)
    const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);
    const spreadsheetId = env.G_SHEET_ID;

    // 2. Fetch Data (Ambil Row 1 sampai 1000)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tab}!A1:Z1000?valueRenderOption=UNFORMATTED_VALUE`;
    
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resp.ok) {
        const errJson = await resp.json();
        throw new Error(`Gagal mengambil data dari Google Sheet: ${errJson.error.message}`);
    }
    
    const data = await resp.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return new Response(JSON.stringify({ success: true, data: [], meta: { tab } }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 3. Mapping Data (Array to Object)
    const headers = rows[0]; 
    const rawData = rows.slice(1); 

    const franchises = rawData.map(row => {
      let item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] !== undefined ? row[index] : null;
      });

      // --- LOGIC CLOUDINARY TRANSFORMATION ---
      if (item.logo_url && item.logo_url.includes('cloudinary.com')) {
        item.logo_url_optimized = item.logo_url.replace('/upload/', '/upload/e_bgremoval,c_pad,w_300,h_300,f_auto,q_auto/');
      } else {
        item.logo_url_optimized = item.logo_url;
      }

      if (item.cover_url && item.cover_url.includes('cloudinary.com')) {
        item.cover_url_optimized = item.cover_url.replace('/upload/', '/upload/c_fill,w_800,h_450,f_auto,q_auto/');
      }

      return item;
    });

    const normalizeText = (value) => (value || '').toString().replace(/\s+/g, ' ').trim();
    const isUrlLike = (text) => /^(https?:\/\/|www\.)/i.test(normalizeText(text));
    const isPhoneLike = (text) => {
      const raw = normalizeText(text);
      const digits = raw.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 16 && (digits.length / Math.max(raw.length, 1)) > 0.6;
    };
    const isLikelyClaimBrandRow = (item) => {
      const brandName = normalizeText(item.brand_name);
      if (!brandName || brandName.length < 2) return false;
      if (isUrlLike(brandName) || isPhoneLike(brandName)) return false;
      const hasEvidence =
        normalizeText(item.source_ignore) ||
        normalizeText(item.full_desc) ||
        normalizeText(item.company_name) ||
        normalizeText(item.phone) ||
        normalizeText(item.label);
      return Boolean(hasEvidence);
    };

    let responseData = franchises;
    if (tab.toUpperCase() === 'UNCLAIMED' && purpose === 'claim-search') {
      const seen = new Set();
      responseData = franchises
        .filter(isLikelyClaimBrandRow)
        .map((item) => ({
          ...item,
          brand_name: normalizeText(item.brand_name),
          category: normalizeText(item.category),
          min_capital: normalizeText(item.min_capital),
        }))
        .filter((item) => {
          const key = item.brand_name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    return new Response(JSON.stringify({
        success: true,
        data: responseData,
        meta: {
            tab: tab,
            total: responseData.length,
            timestamp: new Date().toISOString()
        }
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", 
        "Access-Control-Allow-Origin": "*" 
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// --- HELPER AUTH (Sama persis dengan form-submit.js) ---
async function getGoogleAuthToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly", // Readonly cukup
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));

  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "")
    .replace(/\\n/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(encodedHeader + "." + encodedClaim)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}
