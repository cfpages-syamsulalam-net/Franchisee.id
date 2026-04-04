(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    FF.state = FF.state || {
        unclaimedBrands: [],
        searchableClaimBrands: [],
        selectedBrand: null,
        currentStep: 1,
        totalSteps: 5,
        citiesData: []
    };

    FF.constants = FF.constants || {
        CLAIM_STORAGE_KEY: 'franchise_claim_state',
        CLAIM_STORAGE_TTL_MS: 24 * 60 * 60 * 1000,
        FRANCHISOR_DRAFT_KEY: 'franchisor_form_draft',
        FRANCHISOR_DRAFT_TTL_MS: 72 * 60 * 60 * 1000,
        DEFAULT_COUNTRY_CODES: [
            { code: '+62', label: '🇮🇩 ID +62' },
            { code: '+60', label: '🇲🇾 MY +60' },
            { code: '+65', label: '🇸🇬 SG +65' },
            { code: '+1', label: '🇺🇸 US +1' },
            { code: '+61', label: '🇦🇺 AU +61' }
        ]
    };

    const utils = FF.utils = FF.utils || {};

    utils.slugify = function (text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    utils.isUrlLike = function (text) {
        return /^(https?:\/\/|www\.)/i.test(text || '');
    };

    utils.isPhoneLike = function (text) {
        const raw = (text || '').toString();
        const digits = raw.replace(/\D/g, '');
        return digits.length >= 9 && digits.length <= 16 && (digits.length / Math.max(raw.length, 1)) > 0.6;
    };

    utils.isLegalEntityLike = function (text) {
        return /^(pt|cv|ud|pd|yayasan|koperasi|perum|tbk)\b\.?/i.test((text || '').toString().trim());
    };

    utils.isContactLabelLike = function (text) {
        const t = (text || '').toString().toLowerCase();
        if (!t) return false;
        return /\b(call|telp|telepon|whatsapp|wa|marketing|owner|admin|contact|cp|ibu|bpk)\b/i.test(t);
    };

    utils.isAddressLike = function (text) {
        const t = (text || '').toString().toLowerCase();
        if (!t) return false;
        const hasAddressToken = /\b(jl|jalan|rt|rw|kel|kec|kab|kota|blok|no|nomor|ruko|komplek|km|desa|kav|kavling)\b/i.test(t);
        if (!hasAddressToken) return false;
        const hasDigits = /\d/.test(t);
        const words = t.split(/\s+/).filter(Boolean).length;
        return hasDigits || words >= 4;
    };

    utils.isGenericCategoryLike = function (text) {
        const t = (text || '').toString().toLowerCase().trim();
        if (!t) return false;
        const generic = new Set([
            'otomotif',
            'makanan & minuman',
            'retail & minimarket',
            'jasa & layanan',
            'pendidikan',
            'kesehatan & kecantikan',
            'anak & balita',
            'lainnya',
            'bisnis jasa'
        ]);
        return generic.has(t);
    };

    utils.getCleanBrandName = function (raw) {
        return (raw || '').toString().replace(/\s+/g, ' ').trim();
    };

    FF.buildSearchableClaimBrands = function (brands) {
        const unique = new Set();
        const out = [];

        (brands || []).forEach((brand, idx) => {
            const cleanName = utils.getCleanBrandName(brand.brand_name);
            if (!cleanName) return;
            if (!/[a-z]/i.test(cleanName)) return;
            if (utils.isUrlLike(cleanName) || utils.isPhoneLike(cleanName)) return;
            if (utils.isLegalEntityLike(cleanName) || utils.isContactLabelLike(cleanName)) return;
            if (utils.isAddressLike(cleanName) || utils.isGenericCategoryLike(cleanName)) return;

            const key = cleanName.toLowerCase();
            if (unique.has(key)) return;
            unique.add(key);

            out.push({ ...brand, __idx: idx, __displayName: cleanName });
        });

        return out;
    };

    FF.saveClaimModeState = function (brand) {
        if (!brand) return;
        const now = Date.now();
        const payload = {
            active: true,
            brand: {
                id: brand.id || '',
                brand_name: utils.getCleanBrandName(brand.brand_name),
                category: brand.category || '',
                min_capital: brand.min_capital || ''
            },
            saved_at: new Date(now).toISOString(),
            expires_at: new Date(now + FF.constants.CLAIM_STORAGE_TTL_MS).toISOString()
        };
        localStorage.setItem(FF.constants.CLAIM_STORAGE_KEY, JSON.stringify(payload));
    };

    FF.getClaimModeState = function () {
        try {
            const raw = localStorage.getItem(FF.constants.CLAIM_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.active || !parsed.brand || !parsed.brand.brand_name) return null;

            const now = Date.now();
            const expiresAt = Date.parse(parsed.expires_at || '');
            const savedAt = Date.parse(parsed.saved_at || '');

            if (Number.isFinite(expiresAt)) {
                if (expiresAt <= now) {
                    localStorage.removeItem(FF.constants.CLAIM_STORAGE_KEY);
                    return null;
                }
            } else if (Number.isFinite(savedAt)) {
                if ((savedAt + FF.constants.CLAIM_STORAGE_TTL_MS) <= now) {
                    localStorage.removeItem(FF.constants.CLAIM_STORAGE_KEY);
                    return null;
                }
            }

            return parsed;
        } catch (_) {
            localStorage.removeItem(FF.constants.CLAIM_STORAGE_KEY);
            return null;
        }
    };

    FF.clearClaimModeState = function () {
        localStorage.removeItem(FF.constants.CLAIM_STORAGE_KEY);
    };

    FF.saveFranchisorDraft = function (form) {
        if (!form) return;
        const payload = { fields: {}, saved_at: Date.now() };
        const fd = new FormData(form);

        for (const [key, value] of fd.entries()) {
            if (key === 'unclaimed_id') continue;
            const text = (value || '').toString();
            if (payload.fields[key] === undefined) {
                payload.fields[key] = text;
            } else if (Array.isArray(payload.fields[key])) {
                payload.fields[key].push(text);
            } else {
                payload.fields[key] = [payload.fields[key], text];
            }
        }

        localStorage.setItem(FF.constants.FRANCHISOR_DRAFT_KEY, JSON.stringify(payload));
    };

    FF.getFranchisorDraft = function () {
        try {
            const raw = localStorage.getItem(FF.constants.FRANCHISOR_DRAFT_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.fields) return null;
            const savedAt = Number(parsed.saved_at || 0);
            if (!savedAt || (savedAt + FF.constants.FRANCHISOR_DRAFT_TTL_MS) < Date.now()) {
                localStorage.removeItem(FF.constants.FRANCHISOR_DRAFT_KEY);
                return null;
            }
            return parsed;
        } catch (_) {
            localStorage.removeItem(FF.constants.FRANCHISOR_DRAFT_KEY);
            return null;
        }
    };

    FF.clearFranchisorDraft = function () {
        localStorage.removeItem(FF.constants.FRANCHISOR_DRAFT_KEY);
    };

    FF.restoreFranchisorDraft = function (form) {
        if (!form) return;
        const draft = FF.getFranchisorDraft();
        if (!draft || !draft.fields) return;

        Object.entries(draft.fields).forEach(([name, val]) => {
            const nodes = form.querySelectorAll(`[name="${name}"]`);
            if (!nodes.length) return;

            const values = Array.isArray(val) ? val.map(v => (v || '').toString()) : [(val || '').toString()];

            nodes.forEach((node) => {
                const type = (node.type || '').toLowerCase();
                if (type === 'checkbox' || type === 'radio') {
                    node.checked = values.includes((node.value || '').toString());
                } else if (node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' || type === 'hidden' || type === 'text' || type === 'number' || type === 'email' || type === 'url' || type === 'tel') {
                    node.value = values[0] || '';
                }
            });
        });
    };
})(window);
