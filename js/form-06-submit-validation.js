(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};

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
            lForm.addEventListener('submit', function (e) {
                e.preventDefault();
                FF.submitToCloudflare(this, 'FRANCHISOR');
            });

            FF.restoreFranchisorDraft(lForm);
            const persistDraftHandler = () => FF.saveFranchisorDraft(lForm);
            lForm.addEventListener('input', persistDraftHandler);
            lForm.addEventListener('change', persistDraftHandler);
        }
    };
})(window);
