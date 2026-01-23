// /js/build-listing.js v1.0
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// --- KONFIGURASI PATH ---
// Sesuaikan dengan struktur folder repo kamu
const TEMPLATE_PATH = path.join(__dirname, '../templates/peluang-usaha-tpl.html');
const OUTPUT_PATH = path.join(__dirname, '../peluang-usaha/index.html');
const SHEET_ID = process.env.G_SHEET_ID; // Dari Github Secrets
const SHEET_TAB = 'FRANCHISOR'; 

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
    if (!angka) return 'Tanya Admin';
    let num = parseFloat(angka.toString().replace(/[^0-9]/g, ''));
    if (isNaN(num) || num === 0) return 'Tanya Admin';
    
    if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toFixed(1) + ' Miliar';
    if (num >= 1000000) return 'Rp ' + (num / 1000000).toFixed(0) + ' Juta';
    
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// --- HELPER: Optimize Cloudinary Image ---
// Mengubah URL mentah jadi thumbnail kecil agar loading cepat
function optimizeCloudinary(url, width = 400) {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Sisipkan parameter transformasi w_{width},q_auto,f_auto setelah /upload/
    return url.replace('/upload/', `/upload/w_${width},h_250,c_fill,q_auto,f_auto/`); 
}

// --- GENERATOR: HTML Card Item ---
function generateCard(data, index) {
    const slug = slugify(data.brand_name);
    // Fallback image jika kosong
    const rawImage = data.cover_url || data.logo_url || 'https://franchise.id/assets/images/placeholder-franchise.jpg';
    const imageUrl = optimizeCloudinary(rawImage);
    
    const category = data.category || 'Bisnis Umum';
    const description = data.short_desc 
        ? (data.short_desc.length > 90 ? data.short_desc.substring(0, 90) + '...' : data.short_desc) 
        : `Peluang usaha ${data.brand_name} yang menjanjikan.`;

    const investasi = formatRupiah(data.total_investment_value || data.fee_capex);

    // LOGIC TIERING: Verified Badge & Styling
    let badgeHtml = '';
    let cardClass = '';
    
    if (String(data.status).toUpperCase() === 'VERIFIED') {
        // Tambahkan Icon Centang Biru untuk Verified
        badgeHtml = `<i class="fas fa-check-circle" style="color:#3867d6; margin-left:5px;" title="Verified Listing"></i>`;
    }

    // HTML Structure sesuai Template Elementor asli
    return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${cardClass}">
        <a class="uc_post_grid_style_one_image" href="/peluang-usaha/${slug}" target="_self">
            <div class="uc_post_image">
                <img loading="lazy" decoding="async" src="${imageUrl}" alt="${data.brand_name}" width="300" height="150">
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
    
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="/peluang-usaha/${slug}" target="_self">
                            <div class="ue_p_title" style="display:flex; align-items:center;">
                                ${data.brand_name} ${badgeHtml}
                            </div>
                        </a>
                    </div>  
                    
                    <div class="ue-meta-data">
                        <span style="font-size:12px; color:#666; width:100%; display:block; margin-bottom:5px;">
                            <i class="fas fa-wallet" style="margin-right:5px;"></i> Modal: <b>${investasi}</b>
                        </span>
                        <span class="ue-grid-item-category">
                            <a href="/kategori/${slugify(category)}" style="background-color:#eee; color:#333; padding:2px 8px; border-radius:4px; text-decoration:none;">
                                ${category}
                            </a>
                        </span>
                    </div>  
                    
                    <div class="uc_post_text">${description}</div>
                </div>                      
                
                <div class="uc_post_button">
                    <a class="uc_more_btn" target="_self" href="/peluang-usaha/${slug}">
                        <div class="uc_btn_inner">
                            <div class="uc_btn_txt">Info Franchise</div>
                        </div>
                    </a>
                </div>                           
            </div>  
        </div>      
    </div>`;
}

// --- MAIN FUNCTION ---
async function build() {
    console.log('🚀 [SSG] Starting Build Process for /peluang-usaha/index.html ...');

    try {
        // 1. Auth Google Sheets
        const privateKey = process.env.G_PRIVATE_KEY.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(
            process.env.G_CLIENT_EMAIL, null, privateKey,
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Fetch Data
        console.log('📥 Downloading data from Google Sheet...');
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_TAB}!A1:ZZ2000`, 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) throw new Error("Data Sheet Kosong!");

        // 3. Mapping Header -> Data Object
        const headers = rows[0].map(h => h.trim());
        const rawData = rows.slice(1).map(row => {
            let obj = {};
            headers.forEach((h, i) => obj[h] = row[i] || '');
            return obj;
        });

        // 4. SORTING & FILTERING STRATEGY
        // Filter: Hanya yang punya nama brand
        let cleanData = rawData.filter(item => item.brand_name && item.brand_name.trim() !== '');

        // Sort: VERIFIED di atas, sisanya berdasarkan ID (terbaru bawah, atau bisa dibalik)
        cleanData.sort((a, b) => {
            const statusA = (a.status || '').toUpperCase();
            const statusB = (b.status || '').toUpperCase();
            
            // Prioritas 1: Verified selalu di atas
            if (statusA === 'VERIFIED' && statusB !== 'VERIFIED') return -1;
            if (statusA !== 'VERIFIED' && statusB === 'VERIFIED') return 1;
            
            // Prioritas 2: Balik ke urutan original (atau timestamp jika mau terbaru diatas)
            return 0; 
        });

        console.log(`✅ Processed ${cleanData.length} Valid Franchises.`);

        // 5. Generate Grid HTML
        let gridHtml = cleanData.map((item, index) => generateCard(item, index + 1)).join('\n');

        // 6. Read Template & Inject
        if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Template not found at: ${TEMPLATE_PATH}`);
        
        let templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        
        // Periksa apakah placeholder ada
        if (!templateContent.includes('<!-- DYNAMIC_FRANCHISE_LISTING -->')) {
            console.warn("⚠️ Warning: Placeholder '<!-- DYNAMIC_FRANCHISE_LISTING -->' not found in template!");
        }

        const finalHtml = templateContent.replace('<!-- DYNAMIC_FRANCHISE_LISTING -->', gridHtml);

        // 7. Write Output File
        // Pastikan folder tujuan ada
        const outputDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        fs.writeFileSync(OUTPUT_PATH, finalHtml);
        
        console.log(`🎉 SUCCESS! Page generated at: ${OUTPUT_PATH}`);
        console.log(`📊 Stats: ${cleanData.length} items rendered.`);

    } catch (error) {
        console.error('❌ BUILD ERROR:', error);
        process.exit(1);
    }
}

build();