require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// --- CONFIG ---
const TEMPLATE_PATH = path.join(__dirname, '../templates/detail-franchise-tpl.html');
const OUTPUT_BASE = path.join(__dirname, '../peluang-usaha');
const SHEET_FRANCHISOR = 'FRANCHISOR';
const SHEET_UNCLAIMED = 'UNCLAIMED';

// --- HELPER: Slugify ---
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// --- HELPER: Format Rupiah ---
function formatRupiah(angka) {
    if (!angka || angka == 0) return 'Tanya Admin';
    // Bersihkan karakter non-angka
    let clean = angka.toString().replace(/[^0-9]/g, '');
    let num = parseFloat(clean);
    if (isNaN(num)) return angka; // Kembalikan string asli jika bukan angka (misal range "100-200jt")

    if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toFixed(1) + ' Miliar';
    if (num >= 1000000) return 'Rp ' + (num / 1000000).toFixed(0) + ' Juta';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// --- HELPER: Image Optimizer ---
function optimizeImg(url, width = 800) {
    if (!url) return '/wp-content/uploads/2025/09/franchise-placeholder.jpg'; 
    if (url.includes('cloudinary.com')) {
        return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
    }
    return url; // Return as is for non-cloudinary images
}

// --- HELPER: Phone Normalizer (WA vs Landline) ---
function parseContact(phoneRaw) {
    if (!phoneRaw) return { wa: null, phone: null, display: '-' };
    
    // Bersihkan
    let clean = phoneRaw.toString().replace(/[^0-9+]/g, '');
    
    // Cek apakah Landline (021, 031, dll) atau HP (08, 628)
    if (clean.startsWith('02') || clean.startsWith('03') || clean.startsWith('02')) {
        // Kemungkinan Telp Rumah/Kantor
        return { wa: null, phone: clean, display: clean };
    } 
    
    // Logic HP / WA
    let waNumber = clean;
    if (waNumber.startsWith('08')) waNumber = '62' + waNumber.substring(1);
    if (waNumber.startsWith('+')) waNumber = waNumber.substring(1);
    
    // Validasi panjang
    if (waNumber.length < 9) return { wa: null, phone: clean, display: clean };

    return { wa: waNumber, phone: null, display: '+' + waNumber };
}


// --- DATA NORMALIZER (Satukan struktur Unclaimed ke Standar Franchisor) ---
function normalizeData(source, type) {
    if (type === 'FRANCHISOR') {
        // Data sudah bersih, return as is tapi pastikan field minimal ada
        // Gabungkan Country Code + WA
        let waFull = source.whatsapp;
        if(source.country_code && source.whatsapp && !source.whatsapp.startsWith('62')) {
             waFull = source.country_code.replace('+','') + source.whatsapp;
        }

        return {
            status: source.status || 'FREE', // Default FREE jika kosong
            is_verified: (source.status === 'VERIFIED'),
            brand_name: source.brand_name,
            category: source.category,
            company_name: source.company_name,
            total_investment: source.total_investment_value || source.fee_capex,
            franchise_fee: source.fee_license,
            royalty_fee: source.royalty_percent ? source.royalty_percent + '%' : '-',
            ad_fee: source.advertising_fee_percent ? source.advertising_fee_percent + '%' : '-',
            bep: source.estimated_bep_months,
            year: source.year_established,
            outlets: source.total_outlets || '-',
            desc_short: source.short_desc,
            desc_full: source.full_desc,
            logo: source.logo_url,
            cover: source.cover_url,
            gallery: source.gallery_urls,
            website: source.website_url,
            email: source.email_contact,
            address: source.office_address, // Field baru form
            
            // Phone Logic
            contact: {
                wa: waFull,
                phone: null, // Asumsi form kita cuma minta WA
                display: waFull
            }
        };
    } 
    
    else if (type === 'UNCLAIMED') {
        // Mapping kolom UNCLAIMED yang aneh ke Standar
        const contactInfo = parseContact(source.phone);
        
        return {
            status: 'UNCLAIMED',
            is_verified: false,
            brand_name: source.brand_name,
            category: source.category, // Atau gabung source.category + ' ' + source.subcategory
            company_name: source.company_name,
            
            // Investment: Prioritas Min Capital
            total_investment: source.min_capital, 
            
            // Data yang mungkin tidak ada di Unclaimed
            franchise_fee: 'Hubungi Kami',
            royalty_fee: '-', 
            ad_fee: '-',
            bep: '?', 
            year: '-',
            outlets: (source.outlets_location ? 'Banyak Cabang' : '-'), // Deteksi kasar
            
            desc_short: source.full_desc ? source.full_desc.substring(0, 150) + '...' : '',
            desc_full: source.full_desc,
            
            // Image (Mungkin perlu logika scraping gambar nanti, skrg placeholder)
            logo: '', 
            cover: '', 
            gallery: source.brochures, // Ini link gambar brosur, bisa dipake buat gallery sementara
            
            website: '',
            email: '',
            address: source.office_address,
            
            contact: contactInfo
        };
    }
}


// --- MAIN PAGE GENERATOR ---
function generatePageContent(template, rawData, sourceType) {
    const data = normalizeData(rawData, sourceType); // Normalize dulu
    const slug = slugify(data.brand_name);
    
    // 1. REPLACEMENTS (Sama seperti sebelumnya, tapi pakai data yg sudah dinormalisasi)
    let replacements = {
        '{SEO_TITLE}': `${data.brand_name} - Peluang Usaha & Franchise`,
        '{SEO_DESCRIPTION}': (data.desc_short || `Informasi lengkap franchise ${data.brand_name}.`).substring(0, 160),
        '{SLUG}': slug,
        '{OG_IMAGE}': optimizeImg(data.cover || data.logo),
        '{BRAND_NAME}': data.brand_name,
        '{VERIFIED_ICON}': data.is_verified ? '<i class="fas fa-check-circle franchise-verified-badge" title="Verified"></i>' : '',
        '{CATEGORY}': data.category || 'Umum',
        '{CATEGORY-SLUG}': slugify(data.category || 'umum'),
        '{COMPANY_NAME}': data.company_name || '-',
        '{MINIMUM_MODAL}': formatRupiah(data.total_investment),
        '{FRANCHISE_FEE}': formatRupiah(data.franchise_fee),
        '{ROYALTY_FEE}': data.royalty_fee,
        '{ADVERTISING_FEE}': data.ad_fee,
        '{YEAR_ESTABLISHED}': data.year,
        '{OUTLETS_NUMBER}': data.outlets,
        '{BEP_PERIOD}': (data.bep || '?') + ' Bulan',
        '{LOGO_URL}': optimizeImg(data.logo, 300),
        '{HERO_IMAGE}': optimizeImg(data.cover, 1200),
    };

    // 2. LOGIC TABS (Profil & Kontak)
    
    // Tab Profil
    let galleryHtml = '';
    if(data.gallery) {
        // Support pemisah koma (Franchisor) atau newline (Unclaimed Brochures)
        const images = data.gallery.split(/,|\n/).map(u => u.trim()).filter(u => u).slice(0, 5);
        images.forEach(img => {
            galleryHtml += `<img decoding="async" src="${optimizeImg(img, 600)}" style="width:100%; margin-bottom:10px; border-radius:8px;">`;
        });
    }
    const tabProfilHtml = `
        <div class="elementor-widget-container">
            <p>${(data.desc_full || '').replace(/\n/g, '<br>')}</p>
            <div style="margin-top:20px;">${galleryHtml}</div>
        </div>`;

    // Tab Kontak (Logic WA vs Phone vs Unclaimed)
    let tabKontakHtml = '';
    
    if (data.status === 'UNCLAIMED' || data.status === 'FREE') {
        // TAMPILAN TERBATAS / GATEKEEPING
        tabKontakHtml = `
        <div class="elementor-widget-container" style="background:#fff3cd; padding:20px; border-radius:10px; border:1px solid #ffeeba; text-align:center;">
            <h4 style="color:#856404; margin-bottom:10px;">🔒 Kontak Pemilik</h4>
            <p style="margin-bottom:15px;">
                ${data.status === 'UNCLAIMED' ? 'Data bisnis ini belum diklaim oleh pemilik.' : 'Hubungi pemilik melalui perantara Franchise.id.'}
            </p>
            <a href="/pendaftaran?ref=${slug}" class="elementor-button elementor-size-sm" style="background:#d35400; color:#fff; padding:10px 20px; border-radius:5px;">
                Hubungi Admin
            </a>
             ${data.status === 'UNCLAIMED' ? `<br><small class="d-block mt-2"><a href="/pendaftaran?claim=${slug}">Apakah ini bisnis Anda? Klaim Gratis</a></small>` : ''}
        </div>`;
    } else {
        // TAMPILAN VERIFIED (FULL CONTACT)
        let contactButtons = '';
        
        // WA Button
        if (data.contact.wa) {
            contactButtons += `
            <div style="margin-bottom:10px;">
                <a href="https://wa.me/${data.contact.wa}" target="_blank" style="text-decoration:none; color:#25D366; font-weight:bold; display:flex; align-items:center; gap:10px;">
                    <i class="fab fa-whatsapp" style="font-size:24px;"></i> Chat WhatsApp
                </a>
            </div>`;
        }
        // Phone Button (Jika Unclaimed punya no telp rumah)
        if (data.contact.phone) {
             contactButtons += `
            <div style="margin-bottom:10px;">
                <a href="tel:${data.contact.phone}" style="text-decoration:none; color:#333; font-weight:bold; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-phone" style="font-size:20px;"></i> ${data.contact.phone}
                </a>
            </div>`;
        }

        tabKontakHtml = `
        <div class="elementor-widget-container">
            <h5 style="margin-bottom:15px;">Kontak Resmi</h5>
            <p><strong>Perusahaan:</strong> ${data.company_name || '-'}</p>
            <p><strong>Alamat:</strong> ${data.address || '-'}</p>
            <hr>
            ${contactButtons}
            <p style="margin-top:10px;"><strong>Website:</strong> <a href="${data.website || '#'}" target="_blank">${data.website || '-'}</a></p>
        </div>`;
    }
    
    // Inject Tabs
    const tabsStructure = `
    <div class="e-n-tabs">
        <div class="e-n-tabs-heading" style="display:flex; gap:10px; border-bottom:1px solid #eee; margin-bottom:20px;">
            <button onclick="document.getElementById('tab-1-${slug}').style.display='block';document.getElementById('tab-2-${slug}').style.display='none';" style="padding:10px 20px; background:none; border:none; border-bottom:2px solid #000; font-weight:bold; cursor:pointer;">Profil</button>
            <button onclick="document.getElementById('tab-1-${slug}').style.display='none';document.getElementById('tab-2-${slug}').style.display='block';" style="padding:10px 20px; background:none; border:none; font-weight:bold; cursor:pointer; color:#666;">Kontak</button>
        </div>
        <div id="tab-1-${slug}">${tabProfilHtml}</div>
        <div id="tab-2-${slug}" style="display:none;">${tabKontakHtml}</div>
    </div>`;

    replacements['{DYNAMIC_TABS_CONTENT}'] = tabsStructure;

    // 3. DISCLAIMER BOX (Untuk Unclaimed)
    const disclaimerHtml = (data.status === 'UNCLAIMED') ? `
        <div class="disclaimer-box" style="background:#f8d7da; color:#721c24; padding:15px; margin-bottom:20px; border:1px solid #f5c6cb; border-radius:5px;">
            <i class="fas fa-exclamation-triangle"></i> <strong>Unverified Listing:</strong> 
            Data ini dikumpulkan dari sumber publik. Franchise.id tidak menjamin keakuratan data. 
            <a href="/pendaftaran?claim=${slug}" style="text-decoration:underline; font-weight:bold;">Pemilik Bisnis? Klaim Disini.</a>
        </div>` : '';
    
    replacements['<!-- DYNAMIC_DISCLAIMER_BOX -->'] = disclaimerHtml;


    // 4. FINAL REPLACE
    let finalHtml = template;
    for (const [key, value] of Object.entries(replacements)) {
        finalHtml = finalHtml.replace(new RegExp(key, 'g'), value || '');
    }
    return finalHtml;
}


// --- MAIN PROCESS ---
async function build() {
    console.log('🚀 [SSG] Starting Hybrid Build (Franchisor + Unclaimed)...');

    try {
        // 1. Auth
        const privateKey = process.env.G_PRIVATE_KEY.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });
        
        // 2. Fetch FRANCHISOR Data (Official)
        console.log('📥 Fetching Franchisor Data...');
        const res1 = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${SHEET_FRANCHISOR}!A1:ZZ2000` });
        const rows1 = res1.data.values || [];
        const head1 = rows1[0].map(h => h.trim());
        const dataFranchisor = rows1.slice(1).map(r => {
            let o = {}; head1.forEach((h, i) => o[h] = r[i] || ''); return o;
        }).filter(i => i.brand_name);

        // 3. Fetch UNCLAIMED Data (Raw)
        console.log('📥 Fetching Unclaimed Data...');
        const res2 = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${SHEET_UNCLAIMED}!A1:ZZ5000` });
        const rows2 = res2.data.values || [];
        const head2 = rows2[0].map(h => h.trim());
        const dataUnclaimed = rows2.slice(1).map(r => {
            let o = {}; head2.forEach((h, i) => o[h] = r[i] || ''); return o;
        }).filter(i => i.brand_name);

        // 4. Read Template
        const templateStr = fs.readFileSync(TEMPLATE_PATH, 'utf8');

        // 5. Generate Files (Loop keduanya)
        let total = 0;
        
        // Process Franchisor
        for (const item of dataFranchisor) {
            const slug = slugify(item.brand_name);
            if (!slug) continue;
            
            const html = generatePageContent(templateStr, item, 'FRANCHISOR');
            
            const dir = path.join(OUTPUT_BASE, slug);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'index.html'), html);
            total++;
        }

        // Process Unclaimed
        // Note: Kita harus cek duplikat. Jika brand sudah ada di Franchisor, jangan ditimpa oleh Unclaimed.
        const existingSlugs = dataFranchisor.map(i => slugify(i.brand_name));
        
        for (const item of dataUnclaimed) {
            const slug = slugify(item.brand_name);
            if (!slug || existingSlugs.includes(slug)) continue; // Skip jika duplikat
            
            const html = generatePageContent(templateStr, item, 'UNCLAIMED');
            
            const dir = path.join(OUTPUT_BASE, slug);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'index.html'), html);
            total++;
        }

        console.log(`✅ TOTAL BUILT: ${total} detail pages generated.`);

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

build();