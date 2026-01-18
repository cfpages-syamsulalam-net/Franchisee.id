// /functions/form-submit.js
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const sheetName = data.form_type || "DATA_UMUM"; // FRANCHISEE atau FRANCHISOR
    
    // Hapus form_type dari data agar tidak jadi kolom (opsional)
    delete data.form_type;

    // Tambahkan ID Unik & Timestamp
    const finalData = {
      id: crypto.randomUUID().split('-')[0].toUpperCase(), // ID Pendek
      timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      ...data
    };

    // 1. Authenticate with Google (Get Access Token)
    const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);

    // 2. Check if Sheet Exists, if not Create it
    const sheetId = await ensureSheetExists(env.G_SHEET_ID, sheetName, token);

    // 3. Handle Headers & Append Data
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
function cleanPrivateKey(key) {
  // 1. Hapus Header dan Footer PEM
  let body = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "");
  
  // 2. Hapus spasi dan newline (termasuk \n literal string atau karakter enter asli)
  body = body.replace(/\s/g, "").replace(/\\n/g, "");
  
  return body;
}

// 1. Google Service Account Auth (Native Web Crypto - No External Libs)
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

  // Fix Private Key Format for Import
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = cleanPrivateKey(privateKey);
  console.log("Key Length:", pemContents.length);
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(encodedHeader + "." + encodedClaim)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for Access Token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

// 2. Ensure Sheet Exists
async function ensureSheetExists(spreadsheetId, title, token) {
  // Get Spreadsheet Metadata
  const metaResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const meta = await metaResp.json();
  
  const existingSheet = meta.sheets.find(s => s.properties.title === title);
  
  if (existingSheet) {
    return existingSheet.properties.sheetId;
  } else {
    // Create new sheet
    const addResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: title } } }]
        }),
      }
    );
    const addData = await addResp.json();
    return addData.replies[0].addSheet.properties.sheetId;
  }
}

// 3. Smart Append (Handle Dynamic Headers)
async function appendDataSmart(spreadsheetId, sheetName, sheetId, dataObj, token) {
  // A. Get Current Headers (Row 1)
  const range = `${sheetName}!A1:Z1`; // Limit Z1 (26 cols) or extend if needed
  const getResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const getJson = await getResp.json();
  
  let currentHeaders = (getJson.values && getJson.values[0]) ? getJson.values[0] : [];
  
  // B. Identify New Headers
  const inputKeys = Object.keys(dataObj);
  const newHeaders = [];
  
  inputKeys.forEach(key => {
    if (!currentHeaders.includes(key)) {
      newHeaders.push(key);
    }
  });

  // C. Update Headers if needed
  if (newHeaders.length > 0) {
    const startColIndex = currentHeaders.length;
    // Append new headers to Row 1
    // We assume append adds to the next available column
    // But safely, let's write to specific cells if we knew A1 notation logic, 
    // simpler: Just Append to Row 1? No, append adds rows. We must Update cells.
    
    // Easier way: Re-write the whole header row 1
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

  // D. Map Data to Headers Order
  const rowValues = currentHeaders.map(header => {
    // Handle specific file object if simple upload (optional) or just text
    return dataObj[header] || "";
  });

  // E. Append Data Row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:A:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [rowValues] })
    }
  );
}