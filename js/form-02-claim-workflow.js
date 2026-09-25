(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    const S = FF.state;
    const U = FF.utils;

    function escapeClaimHtml(value) {
        return value.replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function escapeClaimRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }


    FF.fetchUnclaimedBrands = async function () {
        try {
            console.log('🔍 Fetching unclaimed brands...');
            let response = await fetch('/json/unclaimed-brands.json');
            if (response.ok) {
                S.unclaimedBrands = await window.FranchiseFetch.readJson(response, 'Data brand belum bisa dimuat.');
                console.log('✅ Loaded from Static JSON:', S.unclaimedBrands.length);
            } else {
                console.log('⚠️ Static JSON not found, falling back to Live API...');
                response = await fetch('/get-franchises?tab=UNCLAIMED&purpose=claim-search');
                const result = await window.FranchiseFetch.readJson(response, 'Data brand belum bisa dimuat.');
                S.unclaimedBrands = result.data || [];
                console.log('✅ Loaded from Live API:', S.unclaimedBrands.length);
            }

            S.searchableClaimBrands = FF.buildSearchableClaimBrands(S.unclaimedBrands);

            const urlParams = new URLSearchParams(window.location.search);
            const claimSlug = urlParams.get('claim');
            const claimId = urlParams.get('claim_id');
            if (claimSlug || claimId) {
                const brand = claimId
                    ? S.unclaimedBrands.find((b) => String(b.id) === claimId)
                    : S.searchableClaimBrands.find((b) => U.slugify(b.__displayName || b.brand_name) === claimSlug);
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
                    const displayName = String(b.__displayName || '');
                    const safeName = escapeClaimHtml(displayName);
                    const safeQuery = escapeClaimRegex(escapeClaimHtml(query));
                    const regex = new RegExp(`(${safeQuery})`, 'gi');
                    const highlighted = safeName.replace(regex, '<strong>$1</strong>');
                    const index = Number.isInteger(b.__idx) ? b.__idx : -1;
                    return `<div class="suggestion-item" data-idx="${index}"><span class="brand-name">${highlighted}</span></div>`;
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

    FF.hideExistingBrandNotice = function () {
        const notice = document.getElementById('existing-brand-notice');
        if (notice) { notice.hidden = true; notice.replaceChildren(); }
    };

    FF.renderExistingBrandNotice = function (matches) {
        const notice = document.getElementById('existing-brand-notice');
        if (!notice) return;
        notice.replaceChildren();
        if (!Array.isArray(matches) || !matches.length) { notice.hidden = true; return; }

        const heading = document.createElement('strong');
        heading.textContent = matches.length > 1 ? 'Brand ini punya beberapa listing.' : 'Brand ini sudah tercantum.';
        notice.appendChild(heading);
        matches.forEach(function (match) {
            const item = document.createElement('div');
            item.className = 'brand-match-item';
            const name = document.createElement('strong');
            name.textContent = match.brand_name || 'Brand';
            item.appendChild(name);
            const detail = document.createElement('span');
            detail.className = 'brand-match-meta';
            const location = [match.category, match.city_origin].filter(Boolean).join(' · ');
            const state = match.state === 'unclaimed'
                ? (match.claim_pending ? 'Klaim sedang ditinjau admin' : 'Belum dikelola')
                : match.state === 'pending_review'
                ? 'Pendaftaran brand belum diterbitkan'
                : match.state === 'managed'
                    ? (match.ownership_confirmed ? 'Pengelola dikonfirmasi admin' : 'Dikelola; kepemilikan belum diverifikasi')
                    : 'Sudah tercantum';
            detail.textContent = location ? state + ' · ' + location : state;
            item.appendChild(detail);
            if (match.ownership_confirmed && match.public_url) {
                const contact = document.createElement('span');
                contact.className = 'brand-match-meta';
                contact.textContent = [match.contact_person && 'PIC: ' + match.contact_person,
                    match.contact_phone && 'Telepon: ' + match.contact_phone].filter(Boolean).join(' · ')
                    || 'Kontak pengelola tersedia di halaman listing.';
                item.appendChild(contact);
            }
            const actions = document.createElement('div');
            actions.className = 'brand-match-actions';
            if (match.claim_id && match.state === 'unclaimed' && !match.claim_pending) {
                const claim = document.createElement('button');
                claim.type = 'button';
                claim.className = 'btn btn-sm btn-warning';
                claim.textContent = 'Klaim listing';
                claim.addEventListener('click', function () {
                    FF.fillMainFranchisorForm({ id: match.claim_id, brand_name: match.brand_name, category: match.category });
                });
                actions.appendChild(claim);
            }
            if (typeof match.public_url === 'string' && /^\/peluang-usaha\/[a-z0-9-]+$/.test(match.public_url)) {
                const link = document.createElement('a');
                link.className = 'btn btn-sm btn-outline-secondary';
                link.href = match.public_url;
                link.textContent = 'Lihat listing';
                actions.appendChild(link);
            }
            item.appendChild(actions);
            notice.appendChild(item);
        });
        notice.hidden = false;
    };

    FF.initExistingBrandNotice = function () {
        const input = document.getElementById('franchisor-brand-name');
        const notice = document.getElementById('existing-brand-notice');
        if (!input || !notice) return;
        let timer;
        let requestId = 0;
        let lastChecked = '';
        async function check() {
            const name = input.value.trim();
            const currentId = ++requestId;
            clearTimeout(timer);
            if (input.readOnly || document.getElementById('main_unclaimed_id')?.value || name.length < 3) {
                FF.hideExistingBrandNotice();
                return;
            }
            if (name.toLowerCase() === lastChecked) return;
            lastChecked = '';
            FF.hideExistingBrandNotice();
            timer = setTimeout(async function () {
                try {
                    const response = await fetch('/brand-match?name=' + encodeURIComponent(name));
                    const data = await window.FranchiseFetch.readJson(response, 'Brand belum bisa diperiksa.');
                    if (currentId !== requestId || input.value.trim() !== name || input.readOnly || document.getElementById('main_unclaimed_id')?.value) return;
                    lastChecked = name.toLowerCase();
                    FF.renderExistingBrandNotice(data.matches || []);
                } catch (error) {
                    if (currentId !== requestId || input.readOnly || document.getElementById('main_unclaimed_id')?.value) return;
                    notice.replaceChildren();
                    const message = document.createElement('span');
                    message.textContent = 'Pengecekan brand belum berhasil. Coba lagi nanti.';
                    notice.appendChild(message);
                    notice.hidden = false;
                    lastChecked = '';
                }
            }, 600);
        }
        input.addEventListener('input', check);
        input.addEventListener('blur', check);
        if (input.value.trim()) check();
    };

    window.fetchUnclaimedBrands = FF.fetchUnclaimedBrands;
    window.fillMainFranchisorForm = FF.fillMainFranchisorForm;
})(window);
