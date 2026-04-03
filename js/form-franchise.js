// /js/form-franchise.js v1.26
document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
	// 1. KLAIM STATE & HELPERS
	// ==========================================
    let unclaimedBrands = [];
    let searchableClaimBrands = [];
    let selectedBrand = null;
    const CLAIM_STORAGE_KEY = 'franchise_claim_state';
    const CLAIM_STORAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    const FRANCHISOR_DRAFT_KEY = 'franchisor_form_draft';
    const FRANCHISOR_DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    function isUrlLike(text) {
        return /^(https?:\/\/|www\.)/i.test(text);
    }

    function isPhoneLike(text) {
        const digits = text.replace(/\D/g, '');
        return digits.length >= 9 && digits.length <= 16 && (digits.length / Math.max(text.length, 1)) > 0.6;
    }

    function isLegalEntityLike(text) {
        return /^(pt|cv|ud|pd|yayasan|koperasi|perum|tbk)\b\.?/i.test((text || '').trim());
    }

    function isContactLabelLike(text) {
        const t = (text || '').toLowerCase();
        if (!t) return false;
        return /\b(call|telp|telepon|whatsapp|wa|marketing|owner|admin|contact|cp|ibu|bpk)\b/i.test(t);
    }

    function isAddressLike(text) {
        const t = (text || '').toLowerCase();
        if (!t) return false;
        const hasAddressToken = /\b(jl|jalan|rt|rw|kel|kec|kab|kota|blok|no|nomor|ruko|komplek|km|desa|kav|kavling)\b/i.test(t);
        if (!hasAddressToken) return false;
        const hasDigits = /\d/.test(t);
        const words = t.split(/\s+/).filter(Boolean).length;
        return hasDigits || words >= 4;
    }

    function isGenericCategoryLike(text) {
        const t = (text || '').toLowerCase().trim();
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
    }

    function getCleanBrandName(raw) {
        return (raw || '').toString().replace(/\s+/g, ' ').trim();
    }

    function buildSearchableClaimBrands(brands) {
        const unique = new Set();
        const out = [];

        brands.forEach((brand, idx) => {
            const cleanName = getCleanBrandName(brand.brand_name);
            if (!cleanName) return;
            if (!/[a-z]/i.test(cleanName)) return;
            if (isUrlLike(cleanName) || isPhoneLike(cleanName)) return;
            if (isLegalEntityLike(cleanName) || isContactLabelLike(cleanName)) return;
            if (isAddressLike(cleanName) || isGenericCategoryLike(cleanName)) return;

            const key = cleanName.toLowerCase();
            if (unique.has(key)) return;
            unique.add(key);

            out.push({ ...brand, __idx: idx, __displayName: cleanName });
        });

        return out;
    }

    function saveClaimModeState(brand) {
        if (!brand) return;
        const now = Date.now();
        const payload = {
            active: true,
            brand: {
                id: brand.id || '',
                brand_name: getCleanBrandName(brand.brand_name),
                category: brand.category || '',
                min_capital: brand.min_capital || ''
            },
            saved_at: new Date(now).toISOString(),
            expires_at: new Date(now + CLAIM_STORAGE_TTL_MS).toISOString()
        };
        localStorage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(payload));
    }

    function getClaimModeState() {
        try {
            const raw = localStorage.getItem(CLAIM_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.active || !parsed.brand || !parsed.brand.brand_name) return null;

            const now = Date.now();
            const expiresAt = Date.parse(parsed.expires_at || '');
            const savedAt = Date.parse(parsed.saved_at || '');

            if (Number.isFinite(expiresAt)) {
                if (expiresAt <= now) {
                    localStorage.removeItem(CLAIM_STORAGE_KEY);
                    return null;
                }
            } else if (Number.isFinite(savedAt)) {
                // Backward compatibility for sessions saved before expires_at existed.
                if ((savedAt + CLAIM_STORAGE_TTL_MS) <= now) {
                    localStorage.removeItem(CLAIM_STORAGE_KEY);
                    return null;
                }
            }

            return parsed;
        } catch (e) {
            localStorage.removeItem(CLAIM_STORAGE_KEY);
            return null;
        }
    }

    function clearClaimModeState() {
        localStorage.removeItem(CLAIM_STORAGE_KEY);
    }

    function saveFranchisorDraft(form) {
        if (!form) return;
        const payload = { fields: {}, saved_at: Date.now() };
        const fd = new FormData(form);

        for (const [key, value] of fd.entries()) {
            if (key === 'unclaimed_id') continue; // claim linkage is persisted separately
            const text = (value || '').toString();
            if (payload.fields[key] === undefined) {
                payload.fields[key] = text;
            } else if (Array.isArray(payload.fields[key])) {
                payload.fields[key].push(text);
            } else {
                payload.fields[key] = [payload.fields[key], text];
            }
        }

        localStorage.setItem(FRANCHISOR_DRAFT_KEY, JSON.stringify(payload));
    }

    function getFranchisorDraft() {
        try {
            const raw = localStorage.getItem(FRANCHISOR_DRAFT_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.fields) return null;
            const savedAt = Number(parsed.saved_at || 0);
            if (!savedAt || (savedAt + FRANCHISOR_DRAFT_TTL_MS) < Date.now()) {
                localStorage.removeItem(FRANCHISOR_DRAFT_KEY);
                return null;
            }
            return parsed;
        } catch (e) {
            localStorage.removeItem(FRANCHISOR_DRAFT_KEY);
            return null;
        }
    }

    function clearFranchisorDraft() {
        localStorage.removeItem(FRANCHISOR_DRAFT_KEY);
    }

    function restoreFranchisorDraft(form) {
        if (!form) return;
        const draft = getFranchisorDraft();
        if (!draft || !draft.fields) return;

        Object.entries(draft.fields).forEach(([name, val]) => {
            const nodes = form.querySelectorAll(`[name="${name}"]`);
            if (!nodes.length) return;

            const values = Array.isArray(val) ? val.map(v => (v || '').toString()) : [(val || '').toString()];

            nodes.forEach(node => {
                const type = (node.type || '').toLowerCase();
                if (type === 'checkbox' || type === 'radio') {
                    node.checked = values.includes((node.value || '').toString());
                } else if (node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' || type === 'hidden' || type === 'text' || type === 'number' || type === 'email' || type === 'url' || type === 'tel') {
                    node.value = values[0] || '';
                }
            });
        });
    }

    async function fetchUnclaimedBrands() {
        try {
            console.log("🔍 Fetching unclaimed brands...");
            let response = await fetch('/data/unclaimed-brands.json');
            if (response.ok) {
                unclaimedBrands = await response.json();
                console.log("✅ Loaded from Static JSON:", unclaimedBrands.length);
            } else {
                console.log("⚠️ Static JSON not found, falling back to Live API...");
                response = await fetch('/get-franchises?tab=UNCLAIMED&purpose=claim-search');
                const result = await response.json();
                unclaimedBrands = result.data || [];
                console.log("✅ Loaded from Live API:", unclaimedBrands.length);
            }

            searchableClaimBrands = buildSearchableClaimBrands(unclaimedBrands);

            const urlParams = new URLSearchParams(window.location.search);
            const claimSlug = urlParams.get('claim');
            if (claimSlug) {
                const brand = searchableClaimBrands.find(b => slugify(b.__displayName || b.brand_name) === claimSlug);
                if (brand) {
                    fillMainFranchisorForm(brand);
                }
            }
        } catch (error) {
            console.error("❌ Error loading brands for autocomplete:", error);
        }
    }

	// --- LOGIC TABS SWITCHER ---
	window.openTab = function(tabName) {
		document.querySelectorAll('.tab-content').forEach(content => {
			content.style.display = 'none';
			content.classList.remove('active');
		});
		document.querySelectorAll('.tab-btn').forEach(btn => {
			btn.classList.remove('active');
		});

		const selectedContent = document.getElementById('tab-' + tabName);
		if(selectedContent) {
			selectedContent.style.display = 'block';
			setTimeout(() => selectedContent.classList.add('active'), 10);
			localStorage.setItem('active_registration_tab', tabName);

			// Re-Validate
			setTimeout(() => {
				const inputs = selectedContent.querySelectorAll('input, select, textarea');
				inputs.forEach(input => {
					if (input.value.trim() !== "" && typeof window.validateSpecificField === "function") {
						window.validateSpecificField(input);
					}
				});
			}, 100);
		}

		const activeBtn = document.querySelector(`button[onclick="openTab('${tabName}')"]`);
		if(activeBtn) activeBtn.classList.add('active');

        if (tabName === 'klaim' && unclaimedBrands.length === 0) {
            fetchUnclaimedBrands();
        }
	};

	// ==========================================
	// 2. CORE MULTI-STEP NAVIGATION
	// ==========================================
	let currentStep = 1;
	const totalSteps = 5;

	window.nextStep = function(stepIndex) {
		if (!window.validateStep(stepIndex)) return; 
		document.getElementById('step-' + stepIndex).classList.remove('active');
		currentStep = stepIndex + 1;
		document.getElementById('step-' + currentStep).classList.add('active');
		window.updateProgressBar(currentStep, totalSteps);
		localStorage.setItem('franchise_form_step', currentStep);
		setTimeout(window.scrollToTopForm, 100); 
	};

	window.prevStep = function(stepIndex) {
		document.getElementById('step-' + stepIndex).classList.remove('active');
		currentStep = stepIndex - 1;
		document.getElementById('step-' + currentStep).classList.add('active');
		window.updateProgressBar(currentStep, totalSteps);
		localStorage.setItem('franchise_form_step', currentStep);
		setTimeout(window.scrollToTopForm, 100);
	};

	window.validateStep = function(stepIndex) {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('mode') === 'preview') return true;

		let currentStepDiv = document.getElementById('step-' + stepIndex);
		let inputs = currentStepDiv.querySelectorAll('input[required], select[required], textarea[required]');
		let isValid = true;

		inputs.forEach(input => {
			if (!input.checkValidity()) {
				input.reportValidity(); 
				isValid = false;
				input.classList.add('is-invalid'); 
			}
		});

		if (isValid && stepIndex === 2) {
			const elCapex = document.getElementById('fee_capex');
			const elConstruct = document.getElementById('fee_construction');
			const valCapex = window.cleanNumber(elCapex.value);
			const valConstruct = window.cleanNumber(elConstruct.value);

			if (valCapex === 0 && valConstruct === 0) {
				const confirmZero = confirm("⚠️ Modal Awal Rp 0? Pastikan benar.");
				if (!confirmZero) { elCapex.focus(); return false; }
			}
		}
		return isValid;
	};

	// ==========================================
	// 3. KALKULASI & INTERAKSI
	// ==========================================
	function calculateAll() {
        const elTotalHidden = document.getElementById('total_investment_value');
		const elOmzet = document.getElementById('omzet_monthly');
		const elProfitPercent = document.getElementById('net_profit_percent');
		const bepDisplayText = document.getElementById('bep_display_text'); 
		const bepValueHidden = document.getElementById('bep_value');
		const bepYearsDisplay = document.getElementById('bep_years_display');

        if (!elTotalHidden || !elOmzet || !elProfitPercent || !bepDisplayText) return;

		const totalModal = parseFloat(elTotalHidden.value) || 0;
		let omzet = window.cleanNumber(elOmzet.value);
		let marginPercent = parseFloat(elProfitPercent.value) || 0;
			
		if (totalModal > 0 && omzet > 0 && marginPercent > 0) {
			let operationalProfit = omzet * (marginPercent / 100);
			if (operationalProfit > 0) {
				let bepMonths = totalModal / operationalProfit;
				let formattedBEP = bepMonths.toFixed(1);
                bepDisplayText.innerText = formattedBEP;
				if(bepValueHidden) bepValueHidden.value = formattedBEP;
				bepDisplayText.className = 'fw-800 ' + (bepMonths > 24 ? 'text-warning' : 'text-success');
				if (bepYearsDisplay) bepYearsDisplay.innerText = `(± ${(bepMonths / 12).toFixed(1)} Tahun)`;
			} else { bepDisplayText.innerText = "∞"; }
		} else { bepDisplayText.innerText = "-"; }
	}

	window.updateMinCapital = function() {
		const elTotalDisplay = document.getElementById('total_display_text');
		const elTotalHidden = document.getElementById('total_investment_value');
		if (!elTotalDisplay || !elTotalHidden) return;

		const prices = document.querySelectorAll('.pkg-price');
		let minPrice = Infinity;
		let found = false;

		prices.forEach(el => {
			let val = window.cleanNumber(el.value);
			if (val > 0) { if (val < minPrice) minPrice = val; found = true; }
		});

		if (found && minPrice !== Infinity) {
			elTotalDisplay.innerText = window.formatRupiah(minPrice);
			elTotalHidden.value = minPrice;
		} else { elTotalDisplay.innerText = "0"; elTotalHidden.value = 0; }
		calculateAll();
	};

	document.querySelectorAll('.calc-bep').forEach(el => {
		el.addEventListener('input', calculateAll);
		el.addEventListener('change', calculateAll);
	});

	// --- CITY AUTOCOMPLETE ---
	let citiesData = [];
	fetch('https://cekkode.github.io/json/data-kota-id.json')
		.then(res => res.json())
		.then(data => { citiesData = data; initCityAutocomplete(); })
		.catch(err => console.error(err));

	function initCityAutocomplete() {
		document.querySelectorAll('.city-autocomplete').forEach(input => {
			if (input.dataset.acInitialized) return;
			input.dataset.acInitialized = "true";
			const listContainer = document.createElement('div');
			listContainer.className = 'city-suggestions';
			input.parentNode.appendChild(listContainer);

			input.addEventListener('input', function() {
				const val = this.value;
				listContainer.innerHTML = '';
				if (!val || citiesData.length === 0) { listContainer.style.display = 'none'; return; }
				const matches = citiesData.filter(city => city.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
				if (matches.length > 0) {
					matches.forEach(city => {
						const item = document.createElement('div');
						item.className = 'city-suggestion-item';
						item.innerHTML = city.replace(new RegExp(`(${val})`, "gi"), "<strong>$1</strong>");
						item.addEventListener('mousedown', (e) => {
							e.preventDefault(); input.value = city; listContainer.style.display = 'none';
						});
						listContainer.appendChild(item);
					});
					listContainer.style.display = 'block';
				} else { listContainer.style.display = 'none'; }
			});
            input.addEventListener('blur', () => setTimeout(() => listContainer.style.display = 'none', 150));
		});
	}

	// ==========================================
	// 4. UNIFIED CLAIMING WORKFLOW (NEW)
	// ==========================================
    const claimSearchInput = document.getElementById('claim-brand-search');
    const claimSearchResults = document.getElementById('claim-search-results');

    if (claimSearchInput) {
        claimSearchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query.length < 2) { claimSearchResults.style.display = 'none'; return; }
            const matches = searchableClaimBrands
                .filter(b => (b.__displayName || '').toLowerCase().includes(query))
                .slice(0, 10);
            if (matches.length > 0) {
                claimSearchResults.innerHTML = matches.map(b => {
                    const regex = new RegExp(`(${query})`, "gi");
                    const highlighted = b.__displayName.replace(regex, "<strong>$1</strong>");
                    return `<div class="suggestion-item" data-idx="${b.__idx}"><span class="brand-name">${highlighted}</span></div>`;
                }).join('');
                claimSearchResults.style.display = 'block';
            } else { claimSearchResults.style.display = 'none'; }
        });

        claimSearchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                const idx = parseInt(item.dataset.idx, 10);
                const brand = Number.isInteger(idx) ? unclaimedBrands[idx] : null;
                if (brand) { 
                    fillMainFranchisorForm(brand); 
                    claimSearchResults.style.display = 'none'; 
                    claimSearchInput.value = ''; 
                }
            }
        });
    }

    function fillMainFranchisorForm(brand, options = {}) {
        const { persist = true, skipScroll = false } = options;
        selectedBrand = brand || null;

        // 1. Switch to Franchisor Tab
        window.openTab('franchisor');

        // 2. Set Hidden Tracker
        const mainUnclaimedId = document.getElementById('main_unclaimed_id');
        if (mainUnclaimedId) mainUnclaimedId.value = brand.id;

        // 3. Pre-fill Visual Alert
        const modeAlert = document.getElementById('claim-mode-alert');
        const brandDisplay = document.getElementById('claiming-brand-display');
        if (modeAlert) modeAlert.style.display = 'block';
        if (brandDisplay) brandDisplay.innerText = getCleanBrandName(brand.brand_name);

        // 4. Map Data to Form Fields
        const fBrandName = document.querySelector('input[name="brand_name"]');
        const fCategory = document.querySelector('select[name="category"]');
        
        if (fBrandName) {
            fBrandName.value = getCleanBrandName(brand.brand_name);
            fBrandName.classList.add('is-valid');
            fBrandName.readOnly = true; // Protect identity
        }

        if (fCategory && brand.category) {
            // Find option matching category string
            Array.from(fCategory.options).forEach(opt => {
                if (opt.text.toLowerCase().includes(brand.category.toLowerCase()) || opt.value.toLowerCase() === brand.category.toLowerCase()) {
                    fCategory.value = opt.value;
                    fCategory.classList.add('is-valid');
                }
            });
        }

        // Modal (Map to first package price as starter)
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
            saveClaimModeState(brand);
        }

        if (!skipScroll) {
            window.scrollToTopForm();
        }
    }

    window.exitClaimMode = function() {
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
        selectedBrand = null;
        clearClaimModeState();
        localStorage.removeItem('franchise_form_autosave');
        if (typeof window.renderPackageInputs === 'function') {
            window.renderPackageInputs(1);
        }
    }

	// ==========================================
	// 5. SUBMISSION & INIT
	// ==========================================
	async function submitToCloudflare(formElement, type) {
		const btn = formElement.querySelector('button[type="submit"]');
		const originalText = btn.innerHTML;
		btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
		btn.disabled = true;

		try {
			const formData = new FormData(formElement);
			const data = Object.fromEntries(formData.entries());
			data.form_type = type;
            
            // If it's a claim, the unclaimed_id is already in the hidden input
            if (data.unclaimed_id) {
                data.form_type = 'claim';
            }

			const response = await fetch('/form-submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			const result = await response.json();
			if (result.success) {
				btn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
                Swal.fire('Berhasil!', 'Data Anda telah tersimpan untuk verifikasi.', 'success').then(() => {
                    localStorage.removeItem('franchise_form_step');
                    localStorage.removeItem('franchise_form_autosave');
                    clearClaimModeState();
                    clearFranchisorDraft();
                    window.location.reload();
                });
			} else { throw new Error(result.message || result.error || 'Gagal'); }
		} catch (error) {
			alert('Kesalahan: ' + error.message);
			btn.innerHTML = originalText;
			btn.disabled = false;
		}
	}

	const fForm = document.getElementById('franchiseeForm');
    const lForm = document.getElementById('franchiseListingForm');

	if (fForm) fForm.addEventListener('submit', function(e) { e.preventDefault(); submitToCloudflare(this, 'FRANCHISEE'); });
	if (lForm) lForm.addEventListener('submit', function(e) { e.preventDefault(); submitToCloudflare(this, 'FRANCHISOR'); });

    if (lForm) {
        restoreFranchisorDraft(lForm);
        const persistDraftHandler = () => saveFranchisorDraft(lForm);
        lForm.addEventListener('input', persistDraftHandler);
        lForm.addEventListener('change', persistDraftHandler);
    }

	// Restore State
    const savedStep = localStorage.getItem('franchise_form_step');
	if (savedStep && parseInt(savedStep) > 1) {
		document.getElementById('step-1').classList.remove('active');
		const targetEl = document.getElementById('step-' + savedStep);
		if (targetEl) { targetEl.classList.add('active'); currentStep = parseInt(savedStep); window.updateProgressBar(currentStep, totalSteps); }
	}

	const lastTab = localStorage.getItem('active_registration_tab');
    const claimState = getClaimModeState();
    const urlParams = new URLSearchParams(window.location.search);
	if (claimState && claimState.active && claimState.brand) {
        fillMainFranchisorForm(claimState.brand, { persist: false, skipScroll: true });
    } else if (urlParams.get('claim')) {
        openTab('klaim');
    } else if (lastTab) {
        openTab(lastTab);
    } else {
        openTab('franchisee');
    }

    window.fetchUnclaimedBrands = fetchUnclaimedBrands;
    window.fillMainFranchisorForm = fillMainFranchisorForm;
});
