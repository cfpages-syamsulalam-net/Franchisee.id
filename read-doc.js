const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

// 1. Load .env manually to avoid dependencies
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');
  }
});

const G_CLIENT_EMAIL = env.G_CLIENT_EMAIL;
const G_PRIVATE_KEY = env.G_PRIVATE_KEY;
const G_DOC_ID = env.G_DOC_ID || "1zqYguLQ7eoeIuoJ7-EY2PpEv4PpRC2S47t0DeYullPA";

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function getGoogleAuthToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/documents.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(encodedHeader + "." + encodedClaim);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${encodedHeader}.${encodedClaim}.${signature}`;

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  };
  
  const body = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

  const resp = await httpsRequest("https://oauth2.googleapis.com/token", options, body);
  const data = await resp.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

async function readDoc() {
  try {
    const token = await getGoogleAuthToken(G_CLIENT_EMAIL, G_PRIVATE_KEY);
    const url = `https://docs.googleapis.com/v1/documents/${G_DOC_ID}`;
    
    const options = {
      headers: { Authorization: `Bearer ${token}` }
    };
    
    const resp = await httpsRequest(url, options);
    
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to fetch doc: ${resp.status} ${errorText}`);
    }
    
    const doc = await resp.json();
    
    // Extract text from the doc structure
    let content = "";
    doc.body.content.forEach(element => {
      if (element.paragraph) {
        element.paragraph.elements.forEach(el => {
          if (el.textRun) {
            content += el.textRun.content;
          }
        });
      }
    });
    
    console.log("--- GOOGLE DOC CONTENT START ---");
    console.log(content);
    console.log("--- GOOGLE DOC CONTENT END ---");
    
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

readDoc();
