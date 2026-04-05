(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    const DEFAULT_COUNTRY_CODES = (FF.constants && FF.constants.DEFAULT_COUNTRY_CODES) || [];

    FF.sanitizeCountryCodeItem = function (item) {
        if (!item || typeof item !== 'object') return null;
        const codeDigits = (item.code || '').toString().replace(/\D/g, '');
        if (!codeDigits) return null;
        const code = '+' + codeDigits;
        const label = (item.label || '').toString().trim() || code;
        return { code, label };
    };

    FF.detectFlagEmojiSupport = function () {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 20;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return true;

            ctx.textBaseline = 'top';
            ctx.font = '16px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText('🇮🇩', 0, 0);
            const flagPixels = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText('ID', 0, 0);
            const textPixels = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);

            for (let i = 0; i < flagPixels.length; i++) {
                if (flagPixels[i] !== textPixels[i]) return true;
            }

            return false;
        } catch (_) {
            return true;
        }
    };

    FF.stripLeadingFlagEmoji = function (label) {
        return (label || '').toString().replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
    };

    FF.applyCountryCodeOptions = function (list) {
        const safeList = (Array.isArray(list) ? list : [])
            .map(FF.sanitizeCountryCodeItem)
            .filter(Boolean);
        const finalList = safeList.length > 0 ? safeList : DEFAULT_COUNTRY_CODES;
        const useFlagEmoji = FF.detectFlagEmojiSupport();

        document.querySelectorAll('select[name="country_code"]').forEach((select) => {
            const previousValue = (select.value || '').toString().trim();
            const html = finalList.map((item) => {
                const displayLabel = useFlagEmoji ? item.label : FF.stripLeadingFlagEmoji(item.label);
                return `<option value="${item.code}">${displayLabel}</option>`;
            }).join('');
            select.innerHTML = html;

            const hasPrevious = finalList.some((item) => item.code === previousValue);
            select.value = hasPrevious ? previousValue : '+62';
        });
    };

    FF.loadCountryCodeOptions = async function () {
        FF.applyCountryCodeOptions(DEFAULT_COUNTRY_CODES);
        try {
            const response = await fetch('/json/country-codes.json');
            if (!response.ok) return;
            const payload = await response.json();
            FF.applyCountryCodeOptions(payload);
        } catch (_) {
            console.warn('⚠️ Failed to load /json/country-codes.json, using defaults.');
        }
    };

    FF.normalizeCountryCode = function (rawCountryCode) {
        const digits = (rawCountryCode || '').toString().replace(/\D/g, '');
        return '+' + (digits || '62');
    };

    FF.normalizeWhatsappForSubmit = function (rawWhatsapp, rawCountryCode) {
        const raw = (rawWhatsapp || '').toString().trim();
        if (!raw) return '';

        if (raw.startsWith('+')) {
            const plusDigits = raw.replace(/[^\d+]/g, '');
            const digitsOnly = plusDigits.replace(/\D/g, '');
            return digitsOnly ? ('+' + digitsOnly) : '';
        }

        const digits = raw.replace(/\D/g, '');
        if (!digits) return '';

        if (digits.startsWith('00')) {
            return '+' + digits.slice(2);
        }

        const countryCode = FF.normalizeCountryCode(rawCountryCode);
        const ccDigits = countryCode.replace(/\D/g, '');

        if (digits.startsWith(ccDigits)) {
            return '+' + digits;
        }

        if (digits.startsWith('0')) {
            return countryCode + digits.slice(1);
        }

        return countryCode + digits;
    };
})(window);
