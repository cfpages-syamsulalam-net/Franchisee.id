// /functions/form-submit.js v2.3
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    
    // --- TEST DATA HANDLING ---
    if (data.test_action === 'create_unclaimed') {
      return await handleCreateUnclaimed(env, data);
    }
    
    if (data.test_action === 'clear_test_data') {
      return await handleClearTestData(env, data);
    }
    // --- END TEST DATA HANDLING ---
    
    let sheetName = data.form_type || "DATA_UMUM";
    const isClaim = data.form_type === "claim";
    
    // Mapping claim ke tab FRANCHISOR
    if (isClaim) {
        sheetName = "FRANCHISOR";
    }
    
    delete data.form_type; // Bersihkan data

    // Data baru yang mau disimpan
    const finalData = {
      id: crypto.randomUUID().split('-')[0].toUpperCase(),
      timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      ...data,
      status: "FREE", // Default for new/claimed
      is_verified: "FALSE",
      video_url: "",
      expiry_date: "",
      is_test_data: data.is_test_data || "" // Mark test data
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

    // --- NEW: Post-Claim Cleanup (Delete from UNCLAIMED) ---
    if (isClaim && (data.unclaimed_id || data.brand_name)) {
        try {
            console.log(`🧹 Post-Claim Cleanup: Deleting claim source from UNCLAIMED (id=${data.unclaimed_id || '-'}, brand=${data.brand_name || '-'})`);
            await deleteFromUnclaimed(env.G_SHEET_ID, data.unclaimed_id, data.brand_name, token);
        } catch (cleanupError) {
            console.error("⚠️ Cleanup Error (Non-critical):", cleanupError.message);
            // Kita tidak gagalkan submit jika hanya cleanup yang gagal
        }
    }

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

// 5. FUNCTION BARU: Delete from Unclaimed
async function deleteFromUnclaimed(spreadsheetId, unclaimedId, brandName, token) {
    const normalizeText = (v) => (v || '').toString().replace(/\s+/g, ' ').trim().toLowerCase();

    // 1. Dapatkan metadata spreadsheet untuk cari sheetId (numerical) dari tab "UNCLAIMED"
    const metaUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + "?fields=sheets.properties";
    const metaResp = await fetch(metaUrl, { headers: { Authorization: "Bearer " + token } });
    const metaData = await metaResp.json();
    
    const unclaimedSheet = metaData.sheets.find(s => s.properties.title === "UNCLAIMED");
    if (!unclaimedSheet) throw new Error("Tab UNCLAIMED tidak ditemukan");
    const sheetId = unclaimedSheet.properties.sheetId;

    // 2. Cari row index berdasarkan ID (kolom A), fallback ke brand_name (kolom B)
    const dataUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + "/values/UNCLAIMED!A:B";
    const dataResp = await fetch(dataUrl, { headers: { Authorization: "Bearer " + token } });
    const dataValues = await dataResp.json();
    
    const rows = dataValues.values || [];
    let rowIndex = -1;

    if (unclaimedId) {
        rowIndex = rows.findIndex(row => (row[0] || '') == unclaimedId);
    }

    if (rowIndex === -1 && brandName) {
        const targetBrand = normalizeText(brandName);
        rowIndex = rows.findIndex(row => normalizeText(row[1]) === targetBrand);
    }

    if (rowIndex === -1) {
        console.warn("Record claim source tidak ditemukan di tab UNCLAIMED. id=" + (unclaimedId || '-') + ", brand=" + (brandName || '-'));
        return;
    }

    // Jangan pernah menghapus baris header
    if (rowIndex === 0) {
        console.warn("Header row matched unexpectedly; abort delete.");
        return;
    }

    // 3. Eksekusi Deletion (batchUpdate)
    const deleteUrl = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + ":batchUpdate";
    const deleteRequest = {
        requests: [
            {
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }
        ]
    };

    const deleteResp = await fetch(deleteUrl, {
        method: 'POST',
        headers: { 
            Authorization: "Bearer " + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteRequest)
    });

    if (!deleteResp.ok) {
        const err = await deleteResp.json();
        throw new Error("Gagal hapus row: " + err.error.message);
    }
    
    console.log("✅ Successfully deleted row index " + rowIndex + " from UNCLAIMED.");
}

// --- TEST DATA HELPER FUNCTIONS ---

async function handleCreateUnclaimed(env, data) {
  try {
    const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);
    const sheetName = "UNCLAIMED";
    const sheetId = await ensureSheetExists(env.G_SHEET_ID, sheetName, token);
    
    const finalData = {
      id: crypto.randomUUID().split('-')[0].toUpperCase(),
      timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      brand_name: data.brand_name || "",
      category: data.category || "",
      min_capital: data.min_capital || "",
      city: data.city || "",
      is_test_data: "TRUE"
    };
    
    await appendDataSmart(env.G_SHEET_ID, sheetName, sheetId, finalData, token);
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: finalData.id,
      message: "UNCLAIMED test data created"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleClearTestData(env, data) {
  try {
    const token = await getGoogleAuthToken(env.G_CLIENT_EMAIL, env.G_PRIVATE_KEY);
    let totalDeleted = 0;
    
    const sheetsToClear = ["FRANCHISOR", "FRANCHISEE", "UNCLAIMED"];
    
    for (const sheetName of sheetsToClear) {
      const deleted = await clearTestDataFromSheet(env.G_SHEET_ID, sheetName, token);
      totalDeleted += deleted;
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      deleted: totalDeleted,
      message: `Cleared ${totalDeleted} test records`
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function clearTestDataFromSheet(spreadsheetId, sheetName, token) {
  try {
    // Get all data
    const range = sheetName + "!A:Z";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    const resp = await fetch(url, {
      headers: { Authorization: "Bearer " + token }
    });
    
    if (!resp.ok) return 0;
    
    const data = await resp.json();
    const rows = data.values || [];
    
    if (rows.length < 2) return 0; // Only header or empty
    
    // Find is_test_data column
    const headers = rows[0];
    const testDataColIndex = headers.findIndex(h => h === 'is_test_data');
    
    if (testDataColIndex === -1) return 0; // Column doesn't exist
    
    // Collect rows to delete (where is_test_data = TRUE)
    // Iterate backwards to avoid index shifting
    let deletedCount = 0;
    
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][testDataColIndex] === 'TRUE') {
        // Delete this row (Google Sheets is 1-indexed, data is 0-indexed)
        const sheetId = data.sheetId || 0;
        await deleteSheetRow(spreadsheetId, sheetName, i + 1, token);
        deletedCount++;
      }
    }
    
    console.log(`✅ Cleared ${deletedCount} test rows from ${sheetName}`);
    return deletedCount;
  } catch (err) {
    console.error(`❌ Error clearing test data from ${sheetName}:`, err.message);
    return 0;
  }
}

async function deleteSheetRow(spreadsheetId, sheetName, rowIndex, token) {
  // First get sheetId
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaResp = await fetch(metaUrl, {
    headers: { Authorization: "Bearer " + token }
  });
  
  if (!metaResp.ok) return;
  
  const meta = await metaResp.json();
  const sheet = meta.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return;
  
  const sheetId = sheet.properties.sheetId;
  
  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const deleteRequest = {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1
        }
      }
    }]
  };
  
  await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: "Bearer " + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(deleteRequest)
  });
}
