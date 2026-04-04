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
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            btn.disabled = true;
        }

        try {
            const formData = new FormData(formElement);
            const data = Object.fromEntries(formData.entries());
            data.form_type = type;

            if (Object.prototype.hasOwnProperty.call(data, 'whatsapp')) {
                data.whatsapp = FF.normalizeWhatsappForSubmit(data.whatsapp, data.country_code);
            }

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
                if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
                Swal.fire('Berhasil!', 'Data Anda telah tersimpan untuk verifikasi.', 'success').then(() => {
                    localStorage.removeItem('franchise_form_step');
                    localStorage.removeItem('franchise_form_autosave');
                    FF.clearClaimModeState();
                    FF.clearFranchisorDraft();
                    window.location.reload();
                });
            } else {
                throw new Error(result.message || result.error || 'Gagal');
            }
        } catch (error) {
            alert('Kesalahan: ' + error.message);
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
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
