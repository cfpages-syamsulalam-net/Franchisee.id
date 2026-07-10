(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};

    FF.initProgressiveFranchisorForm = function () {
        const form = document.getElementById('franchiseListingForm');
        if (!form || form.dataset.progressiveReady) return;
        form.dataset.progressiveReady = 'true';

        bindProgressiveGroups(form);
        bindInvestmentTotal(form);
        bindSupportSystem(form);
        restoreSupportChoices(form);
        syncAllProgressiveGroups(form);
        updateInvestmentTotal(form);
        syncSupportSystem(form);
    };

    function bindProgressiveGroups(form) {
        form.querySelectorAll('[data-progressive-trigger]').forEach((field) => {
            field.addEventListener('input', () => syncAllProgressiveGroups(form));
            field.addEventListener('change', () => syncAllProgressiveGroups(form));
        });

        form.querySelectorAll('[data-progressive-group]').forEach((group) => {
            group.addEventListener('toggle', function () {
                if (this.open) this.dataset.userOpened = 'true';
            });
        });
    }

    function syncAllProgressiveGroups(form) {
        const groupNames = new Set(Array.from(form.querySelectorAll('[data-progressive-group]')).map((group) => group.getAttribute('data-progressive-group')));
        groupNames.forEach((name) => syncProgressiveGroup(form, name));
    }

    function syncProgressiveGroup(form, name) {
        if (!name) return;
        const group = form.querySelector(`[data-progressive-group="${cssEscape(name)}"]`);
        if (!group) return;
        const shouldOpen = Array.from(form.querySelectorAll(`[data-progressive-trigger="${cssEscape(name)}"]`)).some(hasMeaningfulValue)
            || Array.from(group.querySelectorAll('input, select, textarea')).some(hasMeaningfulValue);
        if (shouldOpen) group.open = true;
    }

    function bindInvestmentTotal(form) {
        form.querySelectorAll('[data-total-source]').forEach((field) => {
            field.addEventListener('input', () => updateInvestmentTotal(form));
            field.addEventListener('change', () => updateInvestmentTotal(form));
        });
    }

    function updateInvestmentTotal(form) {
        const hidden = form.querySelector('#total_investment_value');
        const display = form.querySelector('#total_display_text');
        if (!hidden || !display) return;

        const minCapital = cleanNumber(form.querySelector('[name="min_capital"]')?.value);
        const parts = ['fee_license', 'fee_capex', 'fee_construction', 'working_capital_idr']
            .map((name) => cleanNumber(form.querySelector(`[name="${name}"]`)?.value))
            .filter((value) => value > 0);
        const breakdownTotal = parts.reduce((sum, value) => sum + value, 0);
        const total = breakdownTotal > 0 ? breakdownTotal : minCapital;

        hidden.value = total > 0 ? String(total) : '';
        display.textContent = total > 0 ? formatRupiahPlain(total) : '0';
    }

    function bindSupportSystem(form) {
        form.querySelectorAll('[data-support-choice], [data-support-extra]').forEach((field) => {
            field.addEventListener('input', () => syncSupportSystem(form));
            field.addEventListener('change', () => syncSupportSystem(form));
        });
    }

    function syncSupportSystem(form) {
        const hidden = form.querySelector('[data-support-system-value]');
        if (!hidden) return;
        const choices = Array.from(form.querySelectorAll('[data-support-choice]:checked')).map((field) => field.value.trim()).filter(Boolean);
        const extra = (form.querySelector('[data-support-extra]')?.value || '').trim();
        hidden.value = [...choices, extra].filter(Boolean).join(', ');
    }

    function restoreSupportChoices(form) {
        const hidden = form.querySelector('[data-support-system-value]');
        if (!hidden || !hidden.value) return;
        const stored = hidden.value.toLowerCase();
        const matched = [];
        form.querySelectorAll('[data-support-choice]').forEach((field) => {
            const value = (field.value || '').toLowerCase();
            if (value && stored.includes(value)) {
                field.checked = true;
                matched.push(field.value);
            }
        });
        const extra = form.querySelector('[data-support-extra]');
        if (extra && !extra.value) {
            const remainder = hidden.value
                .split(',')
                .map((item) => item.trim())
                .filter((item) => item && !matched.some((choice) => choice.toLowerCase() === item.toLowerCase()));
            extra.value = remainder.join(', ');
        }
    }

    function hasMeaningfulValue(field) {
        if (!field || field.disabled) return false;
        const type = (field.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') return field.checked;
        const value = (field.value || '').trim();
        if (!value) return false;
        if (field.matches('[data-progressive-trigger="projection"]')) return value === 'yes';
        return true;
    }

    function cleanNumber(value) {
        const text = (value || '').toString().replace(/[^\d]/g, '');
        return text ? Number(text) : 0;
    }

    function formatRupiahPlain(value) {
        return Number(value || 0).toLocaleString('id-ID');
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
        return String(value).replace(/"/g, '\\"');
    }
})(window);
