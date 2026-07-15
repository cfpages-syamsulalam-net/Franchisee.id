(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};

    // Auto-save configuration
    FF.autoSaveConfig = {
        enabled: true,
        debounceMs: 300, // Wait 300ms after user stops typing
        periodicIntervalMs: 5000, // Save every 5 seconds as safety net
        debounceTimer: null,
        periodicTimer: null
    };

    // Debounced auto-save: saves after user stops typing
    FF.debounceAutoSave = function (form) {
        if (!form || !FF.autoSaveConfig.enabled) return;
        
        // Clear existing timer
        if (FF.autoSaveConfig.debounceTimer) {
            clearTimeout(FF.autoSaveConfig.debounceTimer);
        }
        
        // Set new timer
        FF.autoSaveConfig.debounceTimer = setTimeout(() => {
            if (typeof FF.saveFranchisorDraft === 'function') {
                FF.saveFranchisorDraft(form);
            }
        }, FF.autoSaveConfig.debounceMs);
    };

    // Start periodic auto-save as safety net
    FF.startPeriodicAutoSave = function (form) {
        if (!form || !FF.autoSaveConfig.enabled) return;
        
        // Clear existing periodic timer
        if (FF.autoSaveConfig.periodicTimer) {
            clearInterval(FF.autoSaveConfig.periodicTimer);
        }
        
        FF.autoSaveConfig.periodicTimer = setInterval(() => {
            if (typeof FF.saveFranchisorDraft === 'function') {
                FF.saveFranchisorDraft(form);
            }
        }, FF.autoSaveConfig.periodicIntervalMs);
    };

    // Stop periodic auto-save (cleanup)
    FF.stopPeriodicAutoSave = function () {
        if (FF.autoSaveConfig.periodicTimer) {
            clearInterval(FF.autoSaveConfig.periodicTimer);
            FF.autoSaveConfig.periodicTimer = null;
        }
        if (FF.autoSaveConfig.debounceTimer) {
            clearTimeout(FF.autoSaveConfig.debounceTimer);
            FF.autoSaveConfig.debounceTimer = null;
        }
    };

    FF.bindLiveValidation = function (form) {
        if (!form || typeof window.validateSpecificField !== 'function') return;

        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach((field) => {
            const type = (field.type || '').toLowerCase();
            const isSelectable = field.tagName === 'SELECT' || type === 'radio' || type === 'checkbox';

            field.addEventListener('blur', function () {
                window.validateSpecificField(this);
            });

            field.addEventListener('input', function () {
                this.classList.remove('is-valid', 'is-invalid');
                if (typeof window.removeErrorMsg === 'function') {
                    window.removeErrorMsg(this);
                }
            });

            if (isSelectable) {
                field.addEventListener('change', function () {
                    window.validateSpecificField(this);
                });
            }
        });

        const countryCodeField = form.querySelector('select[name="country_code"]');
        const whatsappField = form.querySelector('input[name="whatsapp"]');
        if (countryCodeField && whatsappField) {
            countryCodeField.addEventListener('change', function () {
                if ((whatsappField.value || '').trim() !== '') {
                    window.validateSpecificField(whatsappField);
                }
            });
        }
    };

    FF.submitToCloudflare = async function (formElement, type) {
        const btn = formElement.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';
        const feedback = FF.ensureSubmitFeedback(formElement);
        FF.setSubmitFeedback(feedback, '', '');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        try {
            const formData = new FormData(formElement);
            const data = Object.fromEntries(formData.entries());
            data.form_type = type;

            // Normalize WhatsApp number
            if (Object.prototype.hasOwnProperty.call(data, 'whatsapp')) {
                data.whatsapp = FF.normalizeWhatsappForSubmit(data.whatsapp, data.country_code);
            }

            // Uppercase PT/CV/UD in company name
            if (Object.prototype.hasOwnProperty.call(data, 'company_name') && data.company_name) {
                data.company_name = data.company_name.replace(/\b(pt|cv|ud)\b/gi, (match) => match.toUpperCase());
            }

            if (data.unclaimed_id) {
                data.form_type = 'claim';
            }

            let authHeaders = {};
            if (window.FranchiseAuth && typeof window.FranchiseAuth.getAuthHeaders === 'function') {
                authHeaders = await window.FranchiseAuth.getAuthHeaders();
            }

            if (!authHeaders.Authorization) {
                throw new Error('Silakan login terlebih dahulu sebelum menyimpan data.');
            }

            const response = await fetch('/form-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify(data)
            });

            const result = await window.FranchiseFetch.readJson(response, 'Pendaftaran belum bisa dikirim.');
            if (result.success) {
                if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
                const nextTarget = FF.formSuccessNextUrl();
                FF.setSubmitFeedback(feedback, 'Data tersimpan. Anda bisa lanjut dari Profil atau kembali ke halaman sebelumnya.', 'success', {
                    actionLabel: nextTarget === '/profil/' ? 'Buka Profil' : 'Kembali ke peluang',
                    actionUrl: nextTarget
                });
                Swal.fire({
                    title: 'Berhasil!',
                    text: 'Data Anda sudah tersimpan. Lanjutkan dari Profil atau kembali ke halaman sebelumnya.',
                    icon: 'success',
                    confirmButtonText: nextTarget === '/profil/' ? 'Buka Profil' : 'Kembali ke peluang'
                }).then(() => {
                    // Clear ALL form data including franchisee step
                    localStorage.removeItem('franchise_form_step');
                    localStorage.removeItem('franchise_form_autosave');
                    localStorage.removeItem('franchisee_form_step'); // Reset franchisee to Step 1
                    FF.clearClaimModeState();
                    FF.clearFranchisorDraft();
                    window.location.href = nextTarget;
                });
            } else {
                throw Object.assign(new Error(result.message || result.error || 'Data belum bisa disimpan.'), {
                    action_url: result.action_url,
                    action_label: result.action_label,
                    action_hint: result.action_hint
                });
            }
        } catch (error) {
            const action = FF.submissionActionFromError(error);
            FF.setSubmitFeedback(feedback, error.message || 'Data belum bisa disimpan.', 'error', action);
            FF.showSubmitModal(error.message || 'Data belum bisa disimpan.', action);
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    };

    FF.ensureSubmitFeedback = function (formElement) {
        let feedback = formElement.querySelector('[data-form-submit-feedback]');
        if (feedback) return feedback;
        feedback = document.createElement('div');
        feedback.className = 'form-submit-feedback';
        feedback.setAttribute('data-form-submit-feedback', '');
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
        formElement.insertBefore(feedback, formElement.firstElementChild || null);
        return feedback;
    };

    FF.setSubmitFeedback = function (feedback, message, type, action) {
        if (!feedback) return;
        feedback.className = 'form-submit-feedback' + (type ? ' is-' + type : '');
        feedback.textContent = '';
        if (!message && !action) {
            feedback.hidden = true;
            return;
        }
        feedback.hidden = false;

        const text = document.createElement('span');
        text.textContent = message || '';
        feedback.appendChild(text);

        if (action && action.hint) {
            const hint = document.createElement('small');
            hint.textContent = action.hint;
            feedback.appendChild(hint);
        }

        if (action && action.url && action.label) {
            const link = document.createElement('a');
            link.className = 'form-submit-feedback-cta';
            link.href = action.url;
            link.textContent = action.label;
            feedback.appendChild(link);
        }
    };

    FF.showSubmitModal = function (message, action) {
        if (!window.Swal || !message) return;
        Swal.fire({
            title: 'Data belum tersimpan',
            text: action && action.hint ? message + ' ' + action.hint : message,
            icon: 'error',
            confirmButtonText: action && action.label ? action.label : 'Mengerti',
            showCancelButton: Boolean(action && action.url),
            cancelButtonText: 'Tetap di halaman ini'
        }).then((result) => {
            if (result.isConfirmed && action && action.url) {
                window.location.href = action.url;
            }
        });
    };

    FF.submissionActionFromError = function (error) {
        if (error && error.action_url && error.action_label) {
            return {
                url: FF.withCurrentNext(error.action_url),
                label: error.action_label,
                hint: error.action_hint || ''
            };
        }
        const message = String(error && error.message ? error.message : '');
        if (/login|masuk/i.test(message)) {
            return {
                url: '/login/?next=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash),
                label: 'Masuk dulu',
                hint: 'Setelah masuk, Anda akan kembali ke form ini.'
            };
        }
        return null;
    };

    FF.formSuccessNextUrl = function () {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || '';
        return next && next.startsWith('/') && !next.startsWith('//') ? next : '/profil/';
    };

    FF.withCurrentNext = function (url) {
        if (!url) return '';
        try {
            const parsed = new URL(url, window.location.origin);
            if (!parsed.searchParams.has('next')) {
                parsed.searchParams.set('next', window.location.pathname + window.location.search + window.location.hash);
            }
            return parsed.pathname + parsed.search + parsed.hash;
        } catch (_) {
            return url;
        }
    };

    FF.initFormSubmission = function () {
        const fForm = document.getElementById('franchiseeForm');
        const lForm = document.getElementById('franchiseListingForm');

        if (fForm) FF.bindLiveValidation(fForm);
        if (lForm) FF.bindLiveValidation(lForm);

        if (fForm) {
            fForm.addEventListener('submit', function (e) {
                e.preventDefault();
                FF.submitToCloudflare(this, 'FRANCHISEE');
            });
        }

        if (lForm) {
            // Restore saved draft on page load
            FF.restoreFranchisorDraft(lForm);
            
            // AGGRESSIVE AUTO-SAVE: Multiple save triggers for maximum data protection
            
            // 1. Immediate save on input (with debouncing)
            const debouncedSaveHandler = (e) => FF.debounceAutoSave(lForm);
            lForm.addEventListener('input', debouncedSaveHandler);
            lForm.addEventListener('change', debouncedSaveHandler);
            
            // 2. Save on step navigation (before moving)
            const origNextStep = window.nextStep;
            if (typeof origNextStep === 'function') {
                window.nextStep = function (stepIndex) {
                    FF.saveFranchisorDraft(lForm); // Save before navigation
                    return origNextStep(stepIndex);
                };
            }
            
            const origPrevStep = window.prevStep;
            if (typeof origPrevStep === 'function') {
                window.prevStep = function (stepIndex) {
                    FF.saveFranchisorDraft(lForm); // Save before navigation
                    return origPrevStep(stepIndex);
                };
            }
            
            // 3. Save when user switches browser tabs or minimizes window
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    FF.saveFranchisorDraft(lForm);
                }
            });
            
            // 4. Save before page unload (refresh/close)
            window.addEventListener('beforeunload', () => {
                FF.saveFranchisorDraft(lForm);
            });
            
            // 5. Start periodic auto-save as safety net (every 5 seconds)
            FF.startPeriodicAutoSave(lForm);
            
            // 6. Save on tab switch
            const origOpenTab = window.openTab;
            if (typeof origOpenTab === 'function') {
                window.openTab = function (tabName) {
                    if (tabName === 'franchisor' || tabName === 'klaim') {
                        FF.saveFranchisorDraft(lForm);
                    }
                    return origOpenTab(tabName);
                };
            }
            
            // Form submission clears all auto-save data
            lForm.addEventListener('submit', function (e) {
                e.preventDefault();
                FF.stopPeriodicAutoSave(); // Stop auto-save on submit
                FF.submitToCloudflare(this, 'FRANCHISOR');
            });
        }
    };
})(window);
