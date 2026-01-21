// form-franchise.js v1.16
document.addEventListener('DOMContentLoaded', function() {
	// ==========================================
	// 1. DEFINISI FUNGSI-FUNGSI UTAMA
	// ==========================================
	// --- LOGIC TABS SWITCHER ---
	window.openTab = function(tabName) {
		// Hide Semua
		document.querySelectorAll('.tab-content').forEach(content => {
			content.style.display = 'none';
			content.classList.remove('active');
		});
		document.querySelectorAll('.tab-btn').forEach(btn => {
			btn.classList.remove('active');
		});

		// Show Selected
		const selectedContent = document.getElementById('tab-' + tabName);
		if(selectedContent) {
			selectedContent.style.display = 'block';
			setTimeout(() => selectedContent.classList.add('active'), 10);
			// Simpan posisi tab
			localStorage.setItem('active_registration_tab', tabName);

			// Re-Validate (Agar centang hijau muncul saat ganti tab)
			setTimeout(() => {
				const inputs = selectedContent.querySelectorAll('input, select, textarea');
				inputs.forEach(input => {
					if (input.value.trim() !== "" && typeof validateSpecificField === "function") {
						validateSpecificField(input);
					}
				});
			}, 100);
		}

		// Activate Button
		const activeBtn = document.querySelector(`button[onclick="openTab('${tabName}')"]`);
		if(activeBtn) activeBtn.classList.add('active');
	};

	// --- LOGIC MULTI STEP NAVIGATION ---
	let currentStep = 1;
	const totalSteps = 5;

	function scrollToTopForm() {
		const formWrapper = document.querySelector('.registration-tabs-wrapper'); 
		if (!formWrapper) return;
		const headerOffset = 140;		   
		const elementPosition = formWrapper.getBoundingClientRect().top;
		const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

		window.scrollTo({ top: offsetPosition, behavior: "smooth" });
	}

	window.nextStep = function(stepIndex) {
		if (!validateStep(stepIndex)) return; 

		document.getElementById('step-' + stepIndex).classList.remove('active');
		currentStep = stepIndex + 1;
		document.getElementById('step-' + currentStep).classList.add('active');
		updateProgressBar(currentStep);
		localStorage.setItem('franchise_form_step', currentStep);
		setTimeout(function() { scrollToTopForm(); }, 100); 
	};

	window.prevStep = function(stepIndex) {
		document.getElementById('step-' + stepIndex).classList.remove('active');
		currentStep = stepIndex - 1;
		document.getElementById('step-' + currentStep).classList.add('active');
		updateProgressBar(currentStep);
		localStorage.setItem('franchise_form_step', currentStep);
		setTimeout(function() { scrollToTopForm(); }, 100);
	};

	function updateProgressBar(step) {
		document.querySelectorAll('.step-item').forEach(item => {
			let itemStep = parseInt(item.getAttribute('data-step'));
			item.classList.remove('active', 'completed');
			if (itemStep === step) item.classList.add('active');
			else if (itemStep < step) {
				item.classList.add('completed'); 
				item.classList.add('active'); 
			}
		});
		let percent = (step / totalSteps) * 100;
		document.getElementById('main_progress_bar').style.width = percent + '%';
	}

	window.validateStep = function(stepIndex) {
		// Admin Bypass (?mode=preview)
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('mode') === 'preview') { console.warn('⚡ VALIDATION BYPASSED ⚡'); return true; }

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
			const valCapex = cleanNumber(elCapex.value);
			const valConstruct = cleanNumber(elConstruct.value);

			if (valCapex === 0 && valConstruct === 0) {
				const confirmZero = confirm(
					"⚠️ PERHATIAN PENTING:\n\n" +
					"Anda mengisi 'Biaya Paket Pusat' dan 'Konstruksi' dengan angka Rp 0.\n\n" +
					"Apakah benar Franchise/Bisnis ini TANPA MODAL AWAL (Gratis)?\n\n" +
					"[OK] Ya, lanjut (Gratis).\n" +
					"[Cancel] Tidak, saya lupa mengisi."
				);
				if (!confirmZero) {
					elCapex.focus();
					flashHighlight(elCapex);
					return false; 
				}
			} 
			else if (valCapex === 0) {
				if(!confirm("⚠️ Konfirmasi:\nBiaya Paket Pusat Rp 0. Apakah benar tidak ada biaya lisensi / peralatan dari pusat?")) {
					elCapex.focus(); return false;
				}
			}
		}

		return isValid;
	};
	
	// --- UTILS: Format Angka ---
	function formatRupiah(angka) {
		if (!angka) return '';
		return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	}

	function cleanNumber(str) {
		if (!str) return 0;
		return parseFloat(str.toString().replace(/\./g, '')) || 0;
	}

	// --- LOGIC VALIDASI SPESIFIK (Global) ---
	window.validateSpecificField = function(field) {
		if (field.offsetParent === null) return;

		let isValid = true;
		let errorMsg = "";
		const val = field.value.trim();
		const name = field.name;

		// RULE 0: Optional & Kosong = Netral
		if (!field.hasAttribute('required') && val === '') {
			field.classList.remove('is-valid', 'is-invalid');
			removeErrorMsg(field);
			return true; 
		}

		// RULE 1: Required
		if (field.hasAttribute('required') && val === '') {
			isValid = false; errorMsg = "Wajib diisi.";
		} 
		// RULE 2: Logic Spesifik
		else if (val !== '') {
			if (name === 'nib_number') {
				if (!/^\d+$/.test(val) || val.length !== 13) { isValid = false; errorMsg = "Harus 13 digit angka."; }
			}
			else if (name === 'haki_number') {
				if (!/^(IDM|DID|JID|IDP|IPT)/i.test(val)) { isValid = false; errorMsg = "Format harus diawali IDM/DID/JID..."; }
			}
			else if (name === 'year_established') {
				if (val < 1900 || val > new Date().getFullYear()) { isValid = false; errorMsg = "Tahun tidak valid."; }
			}
			else if (['brand_name', 'company_name', 'pic_name', 'name'].includes(name)) {
				if (val.length < 3) { isValid = false; errorMsg = "Min. 3 karakter."; }
			}
			else if (field.type === 'email') {
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { isValid = false; errorMsg = "Format email salah."; }
			}
			else if (field.classList.contains('phone-format') || name === 'whatsapp') {
				if (val.replace(/\D/g, '').length < 9) { isValid = false; errorMsg = "Nomor WhatsApp tidak valid."; }
			}
		}

		// UI Feedback
		if (isValid) {
			field.classList.add('is-valid');
			field.classList.remove('is-invalid');
			removeErrorMsg(field);
		} else {
			field.classList.add('is-invalid');
			field.classList.remove('is-valid');
			showErrorMsg(field, errorMsg);
		}
		return isValid;
	};

    function checkProfitConflict() {
		const elRoyalty = document.getElementById('royalty_percent');
		const elBasis = document.getElementById('royalty_basis');
		const elProfit = document.getElementById('net_profit_percent');

		if (!elRoyalty || !elBasis || !elProfit) return;

		const royVal = parseFloat(elRoyalty.value) || 0;
		const profitVal = parseFloat(elProfit.value) || 0;
		const basis = elBasis.value;

		document.querySelectorAll('.profit-conflict-msg').forEach(el => el.remove());
		elRoyalty.classList.remove('is-invalid-logic'); 
		elProfit.classList.remove('is-invalid-logic');

		if (basis === 'omzet' && royVal > 0 && profitVal > 0) {
			if (royVal >= profitVal) {
				const msgText = `
                    <div class="d-flex align-items-start gap-2">
                        <div style="min-width: 20px;">
                            <i class="fas fa-skull-crossbones mt-1"></i>
                        </div>
                        <div>
                            <b class="text-uppercase" style="letter-spacing: 0.5px;">Logika Bisnis Fatal:</b><br>
                            <span style="display:block; margin-top:4px; font-size: 0.9em; opacity: 0.9;">
                                Royalty diambil dari <u>Omzet</u>. Jika Royalty (${royVal}%) ≥ Margin Profit (${profitVal}%), 
                                maka keuntungan mitra dipastikan <b>MINUS (Rugi)</b>.
                            </span>
                        </div>
                    </div>
                `;

				showConflictMsg(elRoyalty, msgText);
				showConflictMsg(elProfit, msgText);
				elRoyalty.classList.add('is-invalid-logic');
				elProfit.classList.add('is-invalid-logic');
			}
		}
	}

	function showConflictMsg(inputElement, htmlContent) {
		const container = inputElement.closest('.input-col');
		if (!container) return;

		const msg = document.createElement('div');
		msg.className = 'validation-warning-msg profit-conflict-msg text-danger bg-soft-danger p-2 rounded mt-2 border border-danger';
		msg.style.fontSize = '0.8rem';
		msg.style.lineHeight = '1.3';
		msg.innerHTML = htmlContent;

		const helperText = container.querySelector('.helper-text-bottom');
		if (helperText && helperText.parentNode === container) {
			container.insertBefore(msg, helperText);
		} else {
			container.appendChild(msg);
		}
	}

	function showErrorMsg(inputField, msg) {
		removeErrorMsg(inputField);
		const parent = inputField.closest('.input-col') || inputField.parentElement;
		const msgDiv = document.createElement('div');
		msgDiv.className = 'validation-error-msg';
		msgDiv.innerText = msg;
		if (parent.querySelector('.helper-text-bottom')) {
			parent.insertBefore(msgDiv, parent.querySelector('.helper-text-bottom'));
		} else {
			parent.appendChild(msgDiv);
		}
	}

	function removeErrorMsg(inputField) {
		const parent = inputField.closest('.input-col') || inputField.parentElement;
		if(parent) {
			const existingMsg = parent.querySelector('.validation-error-msg');
			if (existingMsg) existingMsg.remove();
		}
	}

	// ==========================================
	// 2. LOGIC INTERAKSI FORM
	// ==========================================
	// --- HAKI ---
	const hakiRadios = document.querySelectorAll('.haki-radio');
	const hakiWrapper = document.getElementById('haki_number_wrapper');
	if(hakiWrapper) { 
		const hakiInput = hakiWrapper.querySelector('input');
		hakiRadios.forEach(radio => {
			radio.addEventListener('change', function() {
				const status = this.value;
				if (status === 'registered' || status === 'process') {
					hakiWrapper.classList.remove('d-none');
					if(hakiInput) {
						hakiInput.setAttribute('required', 'required');
						hakiInput.placeholder = status === 'registered' ? "Nomor Sertifikat Merek (Contoh: IDM000123xxx)" : "Nomor Permohonan / Agenda (Contoh: JID2023xxxx)";
					}
				} else {
					hakiWrapper.classList.add('d-none');
					if(hakiInput) {
						hakiInput.removeAttribute('required');
						hakiInput.value = '';
					}
				}
			});
		});
	}

	// --- TIPE OUTLET (Safe Check) ---
	const outletRadios = document.querySelectorAll('.outlet-type');
	const rentLabel = document.getElementById('rent_label');
	const rentInput = document.getElementById('rent_input');
	const rentWrapper = document.getElementById('rent_wrapper');
	const rentPeriodLabel = document.getElementById('rent_period_label');
	const constructLabel = document.getElementById('construction_label');
	const constructHelper = document.getElementById('construction_helper');

	if (outletRadios.length > 0) {
		outletRadios.forEach(radio => {
			radio.addEventListener('change', function() {
				const type = this.value;
				if(rentWrapper) rentWrapper.classList.remove('d-none');

				if (['type_a', 'type_b', 'type_c'].includes(type)) {
					if(rentLabel) rentLabel.innerText = "Estimasi Sewa Lahan (Teras / Space) per Bulan";
					if(rentInput) rentInput.placeholder = "Contoh: 1.000.000";
					if(rentPeriodLabel) rentPeriodLabel.innerText = "/ Bulan";
					if(constructLabel) constructLabel.innerText = "Estimasi Pembuatan Booth / Container / Stand";
					if(constructHelper) constructHelper.innerText = "Isi 0 jika biaya booth / container / stand sudah termasuk di Paket Pusat.";
				} else if (['type_d', 'type_e'].includes(type)) {
					if(rentLabel) rentLabel.innerText = "Rekomendasi Budget Sewa Bangunan per Tahun";
					if(rentInput) rentInput.placeholder = "Contoh: 100.000.000";
					if(rentPeriodLabel) rentPeriodLabel.innerText = "/ Tahun";
					if(constructLabel) constructLabel.innerText = "Estimasi Renovasi Interior & Sipil";
					if(constructHelper) constructHelper.innerText = "Biaya tukang, cat, partisi, fasad, dlsb (disiapkan mandiri oleh mitra).";
				} else if (type === 'type_f') {
					if(rentWrapper) rentWrapper.classList.add('d-none');
					if(constructLabel) constructLabel.innerText = "Estimasi Setup Dapur";
					if(constructHelper) constructHelper.innerText = "Biaya exhaust & penyesuaian dapur.";
				}
			});
		});
	}

	// --- KALKULASI TOTAL & BEP ---
	const totalDisplayText = document.getElementById('total_display_text'); 
	const totalValueHidden = document.getElementById('total_investment_value'); 
	const bepDisplayText = document.getElementById('bep_display_text'); 
	const bepValueHidden = document.getElementById('bep_value');

	function calculateAll() {
		const elLicense = document.getElementById('fee_license');
		const elCapex = document.getElementById('fee_capex');
		const elConstruct = document.getElementById('fee_construction');
		const elOmzet = document.getElementById('omzet_monthly');
		const elProfitPercent = document.getElementById('net_profit_percent');
		const elContract = document.getElementById('contract_years');
		const elRoyaltyPercent = document.getElementById('royalty_percent');
		const elRoyaltyBasis = document.getElementById('royalty_basis');
		const elRoyaltyPeriod = document.getElementById('royalty_period');
		const totalDisplayText = document.getElementById('total_display_text'); 
		const totalValueHidden = document.getElementById('total_investment_value'); 
		const bepDisplayText = document.getElementById('bep_display_text'); 
		const bepValueHidden = document.getElementById('bep_value');
		const bepYearsDisplay = document.getElementById('bep_years_display');

		if(!elLicense || !elCapex || !elConstruct) return;

		let feeLicense = cleanNumber(elLicense.value);
		let feeCapex = cleanNumber(elCapex.value);
		let feeConstruct = cleanNumber(elConstruct.value);
		let totalModal = feeLicense + feeCapex + feeConstruct;
		
		if(totalDisplayText) totalDisplayText.innerText = formatRupiah(totalModal);
		if(totalValueHidden) totalValueHidden.value = totalModal;

		if(elOmzet && elProfitPercent && elContract && bepDisplayText) {
			let omzet = cleanNumber(elOmzet.value);
			let marginPercent = parseFloat(elProfitPercent.value) || 0;
			let contractYears = parseFloat(elContract.value) || 0;
			let contractMonths = contractYears * 12;
			let royPercent = parseFloat(elRoyaltyPercent.value) || 0;
			let royBasis = elRoyaltyBasis ? elRoyaltyBasis.value : 'omzet';
			let royPeriod = elRoyaltyPeriod ? elRoyaltyPeriod.value : 'bulan';

			if (totalModal > 0 && omzet > 0 && marginPercent > 0 && contractYears > 0) {
				let operationalProfit = omzet * (marginPercent / 100);
				let royaltyDeduction = 0;
				let basisAmount = (royBasis === 'omzet') ? omzet : operationalProfit;
				let rawRoyalty = basisAmount * (royPercent / 100);
				if(royPeriod === 'year') { royaltyDeduction = rawRoyalty / 12; } else { royaltyDeduction = rawRoyalty; }

				let finalProfit = operationalProfit - royaltyDeduction;

				if (finalProfit > 0) {
					let bepMonths = totalModal / finalProfit;
					let formattedBEP = bepMonths.toFixed(1);
					bepDisplayText.innerText = formattedBEP;
					if(bepValueHidden) bepValueHidden.value = formattedBEP;
					
					bepDisplayText.className = 'fw-800'; 
					if(bepMonths > contractMonths) bepDisplayText.classList.add('text-danger'); 
					else if (bepMonths > 24) bepDisplayText.classList.add('text-warning'); 
					else bepDisplayText.classList.add('text-success'); 

					if (bepYearsDisplay) {
						let bepYears = bepMonths / 12;
						bepYearsDisplay.innerText = `(± ${bepYears.toFixed(1)} Tahun)`;
					}

				} else {
					bepDisplayText.innerText = "∞"; 
					bepDisplayText.className = 'fw-800 text-danger';
					
					if (bepYearsDisplay) bepYearsDisplay.innerText = "";
				}
			} else {
				bepDisplayText.innerText = "-";
				bepDisplayText.className = 'fw-800 text-muted';
				
				if (bepYearsDisplay) bepYearsDisplay.innerText = "";
			}
		}

		if (typeof checkProfitConflict === "function") {
			checkProfitConflict(); 
		}
	}

	const rupiahInputs = document.querySelectorAll('.rupiah-input');
	rupiahInputs.forEach(input => {
		input.addEventListener('input', function(e) {
			let rawValue = this.value.replace(/[^0-9]/g, '');
			this.value = formatRupiah(rawValue);
			calculateAll();
		});
	});
	
	document.querySelectorAll('.calc-bep, .calc-input').forEach(el => {
		el.addEventListener('input', calculateAll);
		el.addEventListener('change', calculateAll);
	});

	// --- PHONE FORMAT ---
	document.querySelectorAll('.phone-format').forEach(input => {
		input.addEventListener('input', function(e) {
			let rawValue = this.value.replace(/\D/g, '');
			if (rawValue.startsWith('0')) rawValue = rawValue.substring(1);

			let formatted = '';
			if (rawValue.length > 0) {
				formatted = rawValue.substring(0, 3);
				if (rawValue.length > 3) formatted += '-' + rawValue.substring(3, 7);
				if (rawValue.length > 7) formatted += '-' + rawValue.substring(7, 13);
			}
			this.value = formatted;
			if (typeof validateSpecificField === "function") validateSpecificField(this);
		});
	});


	// --- AUTO SAVE & RESTORE ---
	const STORAGE_KEY = 'franchise_form_autosave';

	function initAutoSave() {
		const savedData = localStorage.getItem(STORAGE_KEY);
		if (savedData) {
			try {
				const data = JSON.parse(savedData);
				Object.keys(data).forEach(name => {
					const elements = document.querySelectorAll(`[name="${name}"]:not([type="file"])`);
					elements.forEach(el => {
						if (el.type === 'radio') {
							if (el.value === data[name]) {
								el.checked = true;
								el.dispatchEvent(new Event('change')); 
							}
						} else if (el.type === 'checkbox') {
							if(data[name]) el.checked = true;
						} else {
							el.value = data[name];
							el.dispatchEvent(new Event('input'));
							if(typeof validateSpecificField === "function") validateSpecificField(el);
						}
					});
				});
			} catch (e) {
				console.error("AutoSave Error:", e);
				localStorage.removeItem(STORAGE_KEY);
			}
		}

		const inputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
		inputs.forEach(input => {
			input.addEventListener('input', saveToStorage);
			input.addEventListener('change', saveToStorage);
		});
	}

	function saveToStorage() {
		const form = document.getElementById('franchiseListingForm');
		if(!form) return; 
		const formData = new FormData(form);
		const data = {};
		formData.forEach((value, key) => {
			if (value instanceof File) return; 
			data[key] = value;
		});
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}

	function clearStorage() {
		localStorage.removeItem(STORAGE_KEY);
	}


	// --- CITY AUTOCOMPLETE ---
	let citiesData = [];
	fetch('https://cekkode.github.io/json/data-kota-id.json')
		.then(res => res.json())
		.then(data => {
			citiesData = data;
			initCityAutocomplete();
		})
		.catch(err => console.error("Error Autocomplete Kota:", err));

	function initCityAutocomplete() {
		const inputs = document.querySelectorAll('.city-autocomplete');
		inputs.forEach(input => {
			if (input.dataset.acInitialized) return;
			input.dataset.acInitialized = "true";

			const listContainer = document.createElement('div');
			listContainer.className = 'city-suggestions';
			input.parentNode.appendChild(listContainer);

			input.addEventListener('input', function() {
				const val = this.value;
				listContainer.innerHTML = '';
				this.classList.remove('is-invalid', 'is-valid');
				if (!val || citiesData.length === 0) {
					listContainer.style.display = 'none'; return;
				}
				const matches = citiesData.filter(city => city.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
				if (matches.length > 0) {
					matches.forEach(city => {
						const item = document.createElement('div');
						item.className = 'city-suggestion-item';
						const regex = new RegExp(`(${val})`, "gi");
						item.innerHTML = city.replace(regex, "<strong>$1</strong>");
						item.addEventListener('mousedown', function(e) {
							e.preventDefault();
							input.value = city;
							listContainer.style.display = 'none';
							input.classList.add('is-valid');
						});
						listContainer.appendChild(item);
					});
					listContainer.style.display = 'block';
				} else { listContainer.style.display = 'none'; }
			});

			input.addEventListener('blur', function() {
				setTimeout(() => {
					listContainer.style.display = 'none';
					const typedVal = this.value.trim();
					if (typedVal === "") return;
					const match = citiesData.find(city => city.toLowerCase() === typedVal.toLowerCase());
					if (match) {
						this.value = match;
						this.classList.add('is-valid');
					} else {
						this.value = ""; 
						this.classList.add('is-invalid');
						this.placeholder = "Pilih dari daftar!";
					}
				}, 150);
			});

			document.addEventListener('click', function(e) {
				if (e.target !== input) {
					listContainer.style.display = 'none';
				}
			});
		});
	}

	// --- AUTO FORMATTER (Brand & PT/CV) ---
	const brandInput = document.querySelector('input[name="brand_name"]');
	const companyInput = document.querySelector('input[name="company_name"]');

	if (brandInput) {
		brandInput.addEventListener('blur', function() {
			const raw = this.value;
			if (!raw) return;
			const words = raw.split(' ');
			const formattedWords = words.map(word => {
				if (word === word.toLowerCase()) { return word.charAt(0).toUpperCase() + word.slice(1); }
				return word;
			});
			this.value = formattedWords.join(' ');
		});
	}

	if (companyInput) {
		companyInput.addEventListener('blur', function() {
			let raw = this.value;
			if (!raw) return;
			raw = raw.split(' ').map(word => {
				if (word === word.toLowerCase()) { return word.charAt(0).toUpperCase() + word.slice(1); }
				return word;
			}).join(' ');
			const legalRegex = /\b(pt|cv|ud)\.?\b/gi; 
			const fixed = raw.replace(legalRegex, (match) => { return match.replace('.', '').toUpperCase() + '.'; });
			this.value = fixed;
		});
	}

	// --- SMART NOMINAL (Auto Juta & Validasi) ---
	const moneyInputs = document.querySelectorAll('.rupiah-input');
	moneyInputs.forEach(input => {
		input.addEventListener('blur', function() {
			let rawVal = cleanNumber(this.value); 
			let originalVal = rawVal;
			
			// Logic Auto Juta/Ribu
			if (rawVal > 0) {
				if (rawVal < 100) {
					rawVal = rawVal * 1000000;
					flashHighlight(this);
				} else if (rawVal >= 100 && rawVal < 1000) {
					rawVal = rawVal * 1000;
					flashHighlight(this);
				}
			}
			this.value = formatRupiah(rawVal);
			
			if (originalVal !== rawVal) {
				this.dispatchEvent(new Event('input', { bubbles: true }));
				this.dispatchEvent(new Event('change', { bubbles: true }));
			}

			if (typeof calculateAll === "function") calculateAll();

			// Logic Validasi
			let errorMsg = "";
			let parent = this.closest('.input-col') || this.parentElement;
			
			// Hapus pesan lama dulu
			let existingMsg = parent.querySelector('.validation-warning-msg');
			if (existingMsg) existingMsg.remove();

			if (rawVal > 0 && rawVal < 100000) { errorMsg = "Nominal terlalu kecil? (Min. Rp 100.000)"; } else if (rawVal > 10000000000) { errorMsg = "Nominal > 10 Miliar."; }

			if ((this.name === 'fee_capex' || this.name === 'fee_construction') && rawVal === 0) {
				let msg = document.createElement('div');
				msg.className = 'validation-warning-msg text-warning mt-1';
				msg.style.fontSize = '0.85rem';
				msg.innerHTML = '<i class="fas fa-exclamation-circle"></i> <b>Perhatian:</b> Diisi Rp 0. Pastikan ini benar-benar Gratis / Termasuk Paket.';
				
				if (parent.querySelector('.helper-text-bottom')) { parent.insertBefore(msg, parent.querySelector('.helper-text-bottom')); } else { parent.appendChild(msg); }
			}

			if (errorMsg) {
				this.classList.add('is-invalid'); 
				this.classList.remove('is-valid');
				showErrorMsg(this, errorMsg);
			} else {
				this.classList.remove('is-invalid'); 
				if(rawVal > 0) this.classList.add('is-valid');
			}
		});
	});

    // --- VALIDASI KHUSUS ROYALTY FEE (Persen) ---
	const royaltyInput = document.getElementById('royalty_percent');
	if (royaltyInput) {
		royaltyInput.addEventListener('blur', function() {
			const val = parseFloat(this.value) || 0;
			const parent = this.closest('.input-col') || this.parentElement;
			
			let existingMsg = parent.querySelector('.validation-warning-msg');
			if (existingMsg) existingMsg.remove();

			let msg = document.createElement('div');
			msg.className = 'validation-warning-msg mt-1';
			msg.style.fontSize = '0.85rem';
			
			if (val === 0) {
				msg.classList.add('text-primary');
				msg.innerHTML = '<i class="fas fa-info-circle"></i> <b>Info:</b> 0% berarti <b>Free Royalty</b> (Bebas Biaya Manajemen).';
				appendMessage(parent, msg);
			} else if (val > 30) {
				msg.classList.add('text-danger');
				msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <b>Peringatan:</b> Royalti > 30% sangat tinggi. Pastikan angka benar.';
				appendMessage(parent, msg);
			} 
		});
	}

	function appendMessage(parent, msgElement) {
		if (parent.querySelector('.helper-text-bottom')) {
			parent.insertBefore(msgElement, parent.querySelector('.helper-text-bottom'));
		} else {
			parent.appendChild(msgElement);
		}
	}

	function flashHighlight(element) {
		element.style.transition = "background-color 0.3s";
		element.style.backgroundColor = "#fff3cd"; 
		setTimeout(() => { element.style.backgroundColor = ""; }, 800);
	}


	// --- SUBMIT FUNCTION ---
	async function submitToCloudflare(formElement, type) {
		const btn = formElement.querySelector('button[type="submit"]');
		const originalText = btn.innerHTML;
		
		btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
		btn.disabled = true;

		try {
			const formData = new FormData(formElement);
			const data = Object.fromEntries(formData.entries());
			data.form_type = type;
			
			if (type === 'FRANCHISOR') {
				const checkboxes = formElement.querySelectorAll('input[name="support[]"]:checked');
				let supportList = [];
				checkboxes.forEach((cb) => supportList.push(cb.value));
				data['support'] = supportList.join(", "); 
				delete data['support[]'];
			}

			const response = await fetch('/form-submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			const result = await response.json();

			if (response.ok) {
				clearStorage();
                localStorage.removeItem('franchise_form_step');
				btn.innerHTML = '<i class="fas fa-check"></i> Tersimpan!';
				btn.classList.replace('btn-primary', 'btn-success');
				btn.classList.replace('btn-warning', 'btn-success');
				
				setTimeout(() => {
					if(window.FormSender) window.FormSender.send(formElement);
					else alert("Data tersimpan! Kami akan menghubungi Anda.");
					formElement.reset();
					window.location.reload();
				}, 1500);

			} else {
				if (result.error === "DUPLICATE_ENTRY") {
					alert("⚠️ GAGAL: " + result.message);
					btn.innerHTML = originalText;
					btn.disabled = false;
				} else {
					throw new Error(result.error || 'Gagal mengirim data');
				}
			}

		} catch (error) {
			console.error('Error:', error);
			btn.innerHTML = 'Gagal. Coba lagi.';
			btn.disabled = false;
			alert('Terjadi kesalahan sistem: ' + error.message);
			setTimeout(() => { btn.innerHTML = originalText; }, 3000);
		}
	}

	const franchiseeForm = document.getElementById('franchiseeForm');
    const franchisorForm = document.getElementById('franchiseListingForm');

	// ==========================================
	// 3. EKSEKUSI INISIALISASI (URUTAN PENTING)
	// ==========================================
	const inputsToValidate = document.querySelectorAll('input:not(.country-select):not(.city-autocomplete), select:not(.country-select), textarea');
	inputsToValidate.forEach(input => {
		input.addEventListener('blur', function() { validateSpecificField(this); });
		input.addEventListener('input', function() { this.classList.remove('is-valid', 'is-invalid'); removeErrorMsg(this); });
		if(input.tagName === 'SELECT' || input.type === 'file') {
			input.addEventListener('change', function() { validateSpecificField(this); });
		}
	});

	if (franchiseeForm) {
		franchiseeForm.addEventListener('submit', function(e) {
			e.preventDefault();
			submitToCloudflare(this, 'FRANCHISEE');
		});
	}

	if (franchisorForm) {
		franchisorForm.addEventListener('submit', function(e) {
			e.preventDefault();
			if (this.checkValidity()) submitToCloudflare(this, 'FRANCHISOR');
			else this.reportValidity();
		});
	}

	initAutoSave();

    const savedStep = localStorage.getItem('franchise_form_step');
	if (savedStep) {
		const targetStep = parseInt(savedStep);
		if (targetStep > 1 && targetStep <= 5) {
			document.getElementById('step-1').classList.remove('active');
			
			const targetEl = document.getElementById('step-' + targetStep);
			if (targetEl) {
				targetEl.classList.add('active');
				currentStep = targetStep;
				updateProgressBar(currentStep);
			} else {
                document.getElementById('step-1').classList.add('active');
            }
		}
	}

	const lastTab = localStorage.getItem('active_registration_tab');
	if (lastTab) openTab(lastTab);
	else openTab('franchisee'); 

	setTimeout(calculateAll, 500);

    // ==========================================
	// 4. RE-VALIDASI SAAT REFRESH (RESTORE STATE)
	// ==========================================
	setTimeout(() => {
		console.log("🔄 Menjalankan Validasi Ulang Data Tersimpan...");

		const criticalCostInputs = [
			document.getElementById('fee_capex'),
			document.getElementById('fee_construction'),
			document.getElementById('royalty_percent'),
			document.getElementById('rent_input')
		];
		criticalCostInputs.forEach(el => {
			if (el) { el.dispatchEvent(new Event('blur')); }
		});

		const otherInputs = document.querySelectorAll('input:not([type="file"]):not(.rupiah-input), select, textarea');
		otherInputs.forEach(el => {
			if (el.value.trim() !== "" && !criticalCostInputs.includes(el)) {
				if (typeof validateSpecificField === "function") {
					validateSpecificField(el);
				}
			}
		});

		if (typeof calculateAll === "function") {
			calculateAll();
		}

        restoreFilePreviews(); 

	}, 600);

    // ==========================================
	// 5. CLOUDINARY UPLOAD INTEGRATION
	// ==========================================
	const CLOUD_NAME = 'dmodrgffo';
	const UPLOAD_PRESET = 'unsigned';
	const TOKEN_STORAGE_KEY = 'cloudinary_delete_tokens';

	function saveDeleteToken(url, token) {
		let tokens = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || '{}');
		const cleanUrl = url.trim();
		tokens[cleanUrl] = { 
			token: token, 
			expiry: Date.now() + (9.5 * 60 * 1000) 
		};
		localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
		console.log("💾 Token tersimpan untuk:", cleanUrl);
	}

	function getDeleteToken(url) {
		let tokens = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || '{}');
		const cleanUrl = url.trim();
		const data = tokens[cleanUrl];
		
		if (!data) {
			console.warn("🔍 Token tidak ditemukan untuk:", cleanUrl);
			console.log("📂 Isi Storage saat ini:", Object.keys(tokens)); // Cek isi storage
			return null;
		}

		if (Date.now() > data.expiry) {
			console.warn("⏰ Token expired untuk:", cleanUrl);
			delete tokens[cleanUrl];
			localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
			return null;
		}
		return data.token;
	}

	async function deleteImageFromCloud(url) {
		const token = getDeleteToken(url);
		if (!token) return false;

		const formData = new FormData();
		formData.append('token', token);
		
		try {
			const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`, {
				method: 'POST', body: formData
			});
			const json = await res.json();
			
			if (json.result === 'ok') {
				let tokens = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || '{}');
				delete tokens[url];
				localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
				return true;
			}
		} catch (e) { console.error("Del Error:", e); }
		return false;
	}

	const fileUploaders = document.querySelectorAll('.file-uploader');
	fileUploaders.forEach(input => {
		input.addEventListener('change', async function(e) {
			const files = e.target.files;
			const targetId = this.getAttribute('data-target');
			const isMultiple = this.getAttribute('data-type') === 'multiple';
			const targetInput = document.getElementById(targetId);
			const previewContainer = document.getElementById('preview_' + targetId);
			
			if (files.length === 0) return;

			for (let i = 0; i < files.length; i++) {
				if (files[i].size > 5 * 1024 * 1024) {
					alert("File terlalu besar! Maksimal 5MB per file.");
					this.value = ''; return;
				}
			}

			if (isMultiple) {
				const currentCount = targetInput.value ? targetInput.value.split(', ').length : 0;
				if (currentCount + files.length > 5) {
					alert("Maksimal 5 foto untuk galeri.");
					this.value = ''; return;
				}
			}

			previewContainer.innerHTML = '<div class="text-warning small"><i class="fas fa-spinner fa-spin"></i> Mengompresi & Mengupload...</div>';
			this.disabled = true;

			try {
				let uploadedUrls = [];

				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					const formData = new FormData();
					formData.append('file', file);
					formData.append('upload_preset', UPLOAD_PRESET);

					const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
						method: 'POST', body: formData
					});

					if (!response.ok) throw new Error('Upload gagal');
					const data = await response.json();
					
					uploadedUrls.push(data.secure_url);
					if (data.delete_token) {
						saveDeleteToken(data.secure_url, data.delete_token);
					}
				}

				if (isMultiple) {
					const existing = targetInput.value ? targetInput.value.split(', ') : [];
					const combined = [...existing, ...uploadedUrls]; 
					targetInput.value = combined.join(', ');
				} else {
					if (targetInput.value) {
						console.log("Menghapus gambar lama:", targetInput.value);
						deleteImageFromCloud(targetInput.value);
					}
					targetInput.value = uploadedUrls[0];
				}

				targetInput.dispatchEvent(new Event('input'));
				targetInput.dispatchEvent(new Event('change'));

				renderPreview(targetInput.value, previewContainer, isMultiple);
				this.value = ''; 

			} catch (error) {
				console.error(error);
				previewContainer.innerHTML = '<div class="text-danger small">Gagal upload. Coba lagi.</div>';
			} finally {
				this.disabled = false;
			}
		});
	});

	function renderPreview(urlSting, container, isMultiple) {
		container.innerHTML = '';
		
		const inputId = container.id.replace('preview_', '');
		const hiddenInput = document.getElementById(inputId);
		const visibleUploader = document.querySelector(`.file-uploader[data-target="${inputId}"]`);
		
		if (visibleUploader && hiddenInput) {
			visibleUploader.classList.remove('is-valid', 'is-invalid');
			const parent = visibleUploader.closest('.input-col');
			if (parent) {
				const oldMsg = parent.querySelector('.validation-error-msg');
				if (oldMsg) oldMsg.remove();
			}

			if (urlSting && urlSting.trim() !== "") {
				visibleUploader.classList.add('is-valid');
			} else {
				if (hiddenInput.hasAttribute('required')) {
					visibleUploader.classList.add('is-invalid');
					if (typeof showErrorMsg === "function") showErrorMsg(visibleUploader, "Wajib upload file.");
				}
			}
		}

		if (!urlSting) return;

		const urls = urlSting.split(',').map(u => u.trim()).filter(u => u !== '');
		
		urls.forEach(url => {
			const wrapper = document.createElement('div');
			wrapper.className = 'position-relative d-inline-block border rounded p-1 bg-light';
			
			const isPdf = url.toLowerCase().includes('.pdf');
			if (isPdf) {
				wrapper.innerHTML = `
					<a href="${url}" target="_blank" class="text-decoration-none text-dark d-flex align-items-center gap-2 px-2 py-1">
						<i class="fas fa-file-pdf text-danger fs-4"></i> <span class="small">Dokumen PDF</span>
					</a>
				`;
			} else {
				const thumbUrl = url.replace('/upload/', '/upload/c_fill,w_100,h_100,q_auto/');
				wrapper.innerHTML = `<a href="${url}" target="_blank"><img src="${thumbUrl}" alt="Preview" style="width:80px; height:80px; object-fit:cover; border-radius:4px;"></a>`;
			}

			const btnRemove = document.createElement('button');
			btnRemove.className = 'btn btn-danger btn-sm position-absolute top-0 start-100 translate-middle rounded-circle p-0 d-flex justify-content-center align-items-center';
			btnRemove.style.width = '20px';
			btnRemove.style.height = '20px';
			btnRemove.innerHTML = '<i class="fas fa-times" style="font-size:10px;"></i>';
			
			btnRemove.onclick = async function(e) {
				e.preventDefault();
				this.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:10px;"></i>';
				this.disabled = true;

				const isDeleted = await deleteImageFromCloud(url);
				
				if (isDeleted) console.log("✅ File dihapus dari Cloud.");
				else console.log("ℹ️ Hapus dari form saja (Token expired/null).");

				let currentUrls = hiddenInput.value.split(',').map(u => u.trim()).filter(u => u !== '');
				const newUrls = currentUrls.filter(u => u !== url);
				hiddenInput.value = newUrls.join(', ');
				hiddenInput.dispatchEvent(new Event('input'));
				renderPreview(hiddenInput.value, container, isMultiple);
			};

			wrapper.appendChild(btnRemove);
			container.appendChild(wrapper);
		});
	}

    function restoreFilePreviews() {
		const urlInputs = ['logo_url', 'cover_url', 'gallery_urls', 'proposal_url'];
		urlInputs.forEach(id => {
			const input = document.getElementById(id);
			if (input && input.value) {
				const previewId = 'preview_' + id;
				const container = document.getElementById(previewId);
				const isMultiple = id === 'gallery_urls';
				renderPreview(input.value, container, isMultiple);
			}
		});
	}

});