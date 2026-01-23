// /functions/form-submit.js v2.2
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const sheetName = data.form_type || "DATA_UMUM";
    
    delete data.form_type; // Bersihkan data

    // Data baru yang mau disimpan
    const finalData = {
      id: crypto.randomUUID().split('-')[0].toUpperCase(),
      timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      ...data,
      status: "FREE",
      is_verified: "FALSE",
      video_url: "",
      expiry_date: ""
    };

    // 1. Auth Google
    const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);

    // 2. Cek Sheet Exists
    const sheetId = await ensureSheetExists(env.G_SHEET_ID, sheetName, token);

    // Hanya cek jika ada Email atau WhatsApp
    if (data.email || data.whatsapp) {
        const isDuplicate = await checkForDuplicates(env.G_SHEET_ID, sheetName, data.email, data.whatsapp, token);
        
        if (isDuplicate) {
            // Stop proses, kembalikan error ke frontend
            return new Response(JSON.stringify({ 
                success: false, 
                error: "DUPLICATE_ENTRY",
                message: "Email atau Nomor WhatsApp ini sudah terdaftar sebelumnya."
            }), {
                status: 409, // Conflict status code
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    // 3. Kalau aman, Simpan Data
    await appendDataSmart(env.G_SHEET_ID, sheetName, sheetId, finalData, token);

    return new Response(JSON.stringify({ success: true, id: finalData.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// --- HELPER FUNCTIONS ---

// 1. Google Auth (SAMA SEPERTI SEBELUMNYA - Tapi pastikan cleanPrivateKey ada)
async function getGoogleAuthToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));

  // Pembersih Key
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

// 2. Ensure Sheet (SAMA SEPERTI SEBELUMNYA)
async function ensureSheetExists(spreadsheetId, title, token) {
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const meta = await metaResp.json();
  const existingSheet = meta.sheets.find(s => s.properties.title === title);
  
  if (existingSheet) {
    return existingSheet.properties.sheetId;
  } else {
    const addResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: title } } }] }),
      }
    );
    const addData = await addResp.json();
    return addData.replies[0].addSheet.properties.sheetId;
  }
}

// 3. Smart Append (SAMA SEPERTI SEBELUMNYA)
async function appendDataSmart(spreadsheetId, sheetName, sheetId, dataObj, token) {
  const range = `${sheetName}!A1:Z1`; 
  const getResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const getJson = await getResp.json();
  let currentHeaders = (getJson.values && getJson.values[0]) ? getJson.values[0] : [];
  
  const inputKeys = Object.keys(dataObj);
  const newHeaders = [];
  inputKeys.forEach(key => {
    if (!currentHeaders.includes(key)) newHeaders.push(key);
  });

  if (newHeaders.length > 0) {
    const allHeaders = [...currentHeaders, ...newHeaders];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [allHeaders] })
      }
    );
    currentHeaders = allHeaders;
  }

  const rowValues = currentHeaders.map(header => dataObj[header] || "");

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:A:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [rowValues] })
    }
  );
}

// 4. FUNCTION BARU: Check Duplicates
async function checkForDuplicates(spreadsheetId, sheetName, email, whatsapp, token) {
    // Ambil semua data (Header + Rows)
    const range = `${sheetName}!A1:Z1000`;
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const result = await response.json();
    
    if (!result.values || result.values.length < 2) return false; // Belum ada data

    const headers = result.values[0];
    const rows = result.values.slice(1);

    // Cari index kolom Email dan Whatsapp
    const emailIndex = headers.indexOf('email');
    const waIndex = headers.indexOf('whatsapp');

    if (emailIndex === -1 && waIndex === -1) return false;

    // Loop data untuk mencari match
    for (let row of rows) {
        // Cek Email (Case insensitive & Trim)
        if (email && emailIndex !== -1 && row[emailIndex]) {
            if (row[emailIndex].trim().toLowerCase() === email.trim().toLowerCase()) {
                return true;
            }
        }
        // Cek WA (Pastikan format bersih angka saja)
        if (whatsapp && waIndex !== -1 && row[waIndex]) {
            // Bersihkan format +62 atau - agar perbandingan apple-to-apple
            const cleanDbWA = row[waIndex].replace(/\D/g, '');
            const cleanInputWA = whatsapp.replace(/\D/g, '');
            if (cleanDbWA === cleanInputWA) {
                return true;
            }
        }
    }

    return false;
}