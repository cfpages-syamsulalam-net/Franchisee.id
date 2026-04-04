(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    const S = FF.state;
    const U = FF.utils;

    FF.fetchUnclaimedBrands = async function () {
        try {
            console.log('🔍 Fetching unclaimed brands...');
            let response = await fetch('/json/unclaimed-brands.json');
            if (response.ok) {
                S.unclaimedBrands = await response.json();
                console.log('✅ Loaded from Static JSON:', S.unclaimedBrands.length);
            } else {
                console.log('⚠️ Static JSON not found, falling back to Live API...');
                response = await fetch('/get-franchises?tab=UNCLAIMED&purpose=claim-search');
                const result = await response.json();
                S.unclaimedBrands = result.data || [];
                console.log('✅ Loaded from Live API:', S.unclaimedBrands.length);
            }

            S.searchableClaimBrands = FF.buildSearchableClaimBrands(S.unclaimedBrands);

            const urlParams = new URLSearchParams(window.location.search);
            const claimSlug = urlParams.get('claim');
            if (claimSlug) {
                const brand = S.searchableClaimBrands.find((b) => U.slugify(b.__displayName || b.brand_name) === claimSlug);
                if (brand) {
                    FF.fillMainFranchisorForm(brand);
                }
            }
        } catch (error) {
            console.error('❌ Error loading brands for autocomplete:', error);
        }
    };

    FF.fillMainFranchisorForm = function (brand, options = {}) {
        const { persist = true, skipScroll = false } = options;
        S.selectedBrand = brand || null;

        window.openTab('franchisor');

        const mainUnclaimedId = document.getElementById('main_unclaimed_id');
        if (mainUnclaimedId) mainUnclaimedId.value = brand.id;

        const modeAlert = document.getElementById('claim-mode-alert');
        const brandDisplay = document.getElementById('claiming-brand-display');
        if (modeAlert) modeAlert.style.display = 'block';
        if (brandDisplay) brandDisplay.innerText = U.getCleanBrandName(brand.brand_name);

        const fBrandName = document.querySelector('input[name="brand_name"]');
        const fCategory = document.querySelector('select[name="category"]');

        if (fBrandName) {
            fBrandName.value = U.getCleanBrandName(brand.brand_name);
            fBrandName.classList.add('is-valid');
            fBrandName.readOnly = true;
        }

        if (fCategory && brand.category) {
            Array.from(fCategory.options).forEach((opt) => {
                if (opt.text.toLowerCase().includes((brand.category || '').toLowerCase()) || opt.value.toLowerCase() === (brand.category || '').toLowerCase()) {
                    fCategory.value = opt.value;
                    fCategory.classList.add('is-valid');
                }
            });
        }

        if (brand.min_capital) {
            localStorage.setItem('franchise_form_autosave', JSON.stringify({
                pkg_name_1: 'Paket Standard',
                pkg_price_1: window.formatRupiah(brand.min_capital)
            }));
            if (typeof window.renderPackageInputs === 'function') {
                window.renderPackageInputs(1);
            }
        }

        if (persist) {
            FF.saveClaimModeState(brand);
        }

        if (!skipScroll) {
            window.scrollToTopForm();
        }
    };

    FF.exitClaimMode = function () {
        const modeAlert = document.getElementById('claim-mode-alert');
        const mainUnclaimedId = document.getElementById('main_unclaimed_id');
        const fBrandName = document.querySelector('input[name="brand_name"]');

        if (modeAlert) modeAlert.style.display = 'none';
        if (mainUnclaimedId) mainUnclaimedId.value = '';
        if (fBrandName) {
            fBrandName.readOnly = false;
            fBrandName.value = '';
            fBrandName.classList.remove('is-valid');
        }

        S.selectedBrand = null;
        FF.clearClaimModeState();
        localStorage.removeItem('franchise_form_autosave');
        if (typeof window.renderPackageInputs === 'function') {
            window.renderPackageInputs(1);
        }
    };

    window.exitClaimMode = FF.exitClaimMode;

    FF.initClaimSearchBindings = function () {
        const claimSearchInput = document.getElementById('claim-brand-search');
        const claimSearchResults = document.getElementById('claim-search-results');
        if (!claimSearchInput || !claimSearchResults) return;

        claimSearchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) {
                claimSearchResults.style.display = 'none';
                return;
            }

            const matches = S.searchableClaimBrands
                .filter((b) => (b.__displayName || '').toLowerCase().includes(query))
                .slice(0, 10);

            if (matches.length > 0) {
                claimSearchResults.innerHTML = matches.map((b) => {
                    const regex = new RegExp(`(${query})`, 'gi');
                    const highlighted = (b.__displayName || '').replace(regex, '<strong>$1</strong>');
                    return `<div class="suggestion-item" data-idx="${b.__idx}"><span class="brand-name">${highlighted}</span></div>`;
                }).join('');
                claimSearchResults.style.display = 'block';
            } else {
                claimSearchResults.style.display = 'none';
            }
        });

        claimSearchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (!item) return;
            const idx = parseInt(item.dataset.idx, 10);
            const brand = Number.isInteger(idx) ? S.unclaimedBrands[idx] : null;
            if (!brand) return;
            FF.fillMainFranchisorForm(brand);
            claimSearchResults.style.display = 'none';
            claimSearchInput.value = '';
        });
    };

    window.fetchUnclaimedBrands = FF.fetchUnclaimedBrands;
    window.fillMainFranchisorForm = FF.fillMainFranchisorForm;
})(window);
