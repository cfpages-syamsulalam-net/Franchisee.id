// /js/form-franchise.js v1.25
document.addEventListener('DOMContentLoaded', function() {
    // ==========================================
	// 1. KLAIM STATE & HELPERS
	// ==========================================
    let unclaimedBrands = [];
    let selectedBrand = null;

    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
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
                response = await fetch('/get-franchises?tab=UNCLAIMED');
                const result = await response.json();
                unclaimedBrands = result.data || [];
                console.log("✅ Loaded from Live API:", unclaimedBrands.length);
            }

            const urlParams = new URLSearchParams(window.location.search);
            const claimSlug = urlParams.get('claim');
            if (claimSlug) {
                const brand = unclaimedBrands.find(b => slugify(b.brand_name) === claimSlug);
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
            const matches = unclaimedBrands.filter(b => b.brand_name.toLowerCase().includes(query)).slice(0, 10);
            if (matches.length > 0) {
                claimSearchResults.innerHTML = matches.map(b => {
                    const regex = new RegExp(`(${query})`, "gi");
                    const highlighted = b.brand_name.replace(regex, "<strong>$1</strong>");
                    return `<div class="suggestion-item" data-id="${b.id}"><span class="brand-name">${highlighted}</span></div>`;
                }).join('');
                claimSearchResults.style.display = 'block';
            } else { claimSearchResults.style.display = 'none'; }
        });

        claimSearchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                const brand = unclaimedBrands.find(b => b.id == item.dataset.id);
                if (brand) { 
                    fillMainFranchisorForm(brand); 
                    claimSearchResults.style.display = 'none'; 
                    claimSearchInput.value = ''; 
                }
            }
        });
    }

    function fillMainFranchisorForm(brand) {
        // 1. Switch to Franchisor Tab
        window.openTab('franchisor');

        // 2. Set Hidden Tracker
        const mainUnclaimedId = document.getElementById('main_unclaimed_id');
        if (mainUnclaimedId) mainUnclaimedId.value = brand.id;

        // 3. Pre-fill Visual Alert
        const modeAlert = document.getElementById('claim-mode-alert');
        const brandDisplay = document.getElementById('claiming-brand-display');
        if (modeAlert) modeAlert.style.display = 'block';
        if (brandDisplay) brandDisplay.innerText = brand.brand_name;

        // 4. Map Data to Form Fields
        const fBrandName = document.querySelector('input[name="brand_name"]');
        const fCategory = document.querySelector('select[name="category"]');
        
        if (fBrandName) {
            fBrandName.value = brand.brand_name;
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

        window.scrollToTopForm();
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

	// Restore State
    const savedStep = localStorage.getItem('franchise_form_step');
	if (savedStep && parseInt(savedStep) > 1) {
		document.getElementById('step-1').classList.remove('active');
		const targetEl = document.getElementById('step-' + savedStep);
		if (targetEl) { targetEl.classList.add('active'); currentStep = parseInt(savedStep); window.updateProgressBar(currentStep, totalSteps); }
	}

	const lastTab = localStorage.getItem('active_registration_tab');
    const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get('claim')) {
        openTab('klaim');
    } else if (lastTab) {
        openTab(lastTab);
    } else {
        openTab('franchisee');
    }

    window.fetchUnclaimedBrands = fetchUnclaimedBrands;
    window.fillMainFranchisorForm = fillMainFranchisorForm;
});
