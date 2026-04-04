// js/build-sitemap.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SITEMAP_PATH = path.join(__dirname, '../sitemap-complete.xml');
const BASE_URL = 'https://franchisee.id';
const TAB_FRANCHISOR = 'FRANCHISOR';
const TAB_UNCLAIMED = 'UNCLAIMED';

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function loadFromCSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        let obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
    }).filter(i => i.brand_name);
}

async function build() {
    console.log('🌐 Generating Dynamic Sitemap...');
    let allBrands = [];

    try {
        const privateKey = (process.env.G_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });

        const resF = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${TAB_FRANCHISOR}!A1:ZZ1000` });
        const resU = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${TAB_UNCLAIMED}!A1:ZZ1000` });

        if (resF.data.values) {
            const h = resF.data.values[0];
            allBrands.push(...resF.data.values.slice(1).map(r => r[h.indexOf('brand_name')]));
        }
        if (resU.data.values) {
            const h = resU.data.values[0];
            allBrands.push(...resU.data.values.slice(1).map(r => r[h.indexOf('brand_name')]));
        }
    } catch (e) {
        console.warn('⚠️ API Failed for sitemap, using CSV.');
        allBrands = [
            ...loadFromCSV(path.join(__dirname, '../csv/franchisors.csv')).map(i => i.brand_name),
            ...loadFromCSV(path.join(__dirname, '../csv/unclaimed.csv')).map(i => i.brand_name)
        ];
    }

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${BASE_URL}/</loc>
        <lastmod>${today}</lastmod>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${BASE_URL}/peluang-usaha/</loc>
        <lastmod>${today}</lastmod>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${BASE_URL}/daftar/</loc>
        <lastmod>${today}</lastmod>
        <priority>0.8</priority>
    </url>`;

    allBrands.forEach(brand => {
        if (!brand) return;
        xml += `
    <url>
        <loc>${BASE_URL}/peluang-usaha/${slugify(brand)}/</loc>
        <lastmod>${today}</lastmod>
        <priority>0.7</priority>
    </url>`;
    });

    xml += `\n</urlset>`;
    fs.writeFileSync(SITEMAP_PATH, xml);
    console.log(`✅ Sitemap generated at ${SITEMAP_PATH} with ${allBrands.length} entries.`);
}

build();
