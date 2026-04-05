(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    const S = FF.state;

    window.openTab = function (tabName) {
        document.querySelectorAll('.tab-content').forEach((content) => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        const selectedContent = document.getElementById('tab-' + tabName);
        if (selectedContent) {
            selectedContent.style.display = 'block';
            setTimeout(() => selectedContent.classList.add('active'), 10);
            localStorage.setItem('active_registration_tab', tabName);

            setTimeout(() => {
                const inputs = selectedContent.querySelectorAll('input, select, textarea');
                inputs.forEach((input) => {
                    if ((input.value || '').trim() !== '' && typeof window.validateSpecificField === 'function') {
                        window.validateSpecificField(input);
                    }
                });
            }, 100);
        }

        const activeBtn = document.querySelector(`button[onclick="openTab('${tabName}')"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (tabName === 'klaim' && S.unclaimedBrands.length === 0 && typeof FF.fetchUnclaimedBrands === 'function') {
            FF.fetchUnclaimedBrands();
        }
    };

    window.nextStep = function (stepIndex) {
        console.log('[Navigation] nextStep called with stepIndex:', stepIndex);
        console.log('[Navigation] Current state.currentStep:', S.currentStep);
        
        if (!window.validateStep(stepIndex)) {
            console.warn('[Navigation] Validation failed, not proceeding to next step');
            return;
        }
        
        const currentEl = document.getElementById('step-' + stepIndex);
        if (currentEl) currentEl.classList.remove('active');

        S.currentStep = stepIndex + 1;
        console.log('[Navigation] Moving to step', S.currentStep);
        
        const nextEl = document.getElementById('step-' + S.currentStep);
        if (nextEl) {
            nextEl.classList.add('active');
            console.log('[Navigation] Step', S.currentStep, 'is now visible');
        } else {
            console.error('[Navigation] Step', S.currentStep, 'element not found!');
        }

        window.updateProgressBar(S.currentStep, S.totalSteps);
        localStorage.setItem('franchise_form_step', String(S.currentStep));
        setTimeout(window.scrollToTopForm, 100);
    };

    window.prevStep = function (stepIndex) {
        const currentEl = document.getElementById('step-' + stepIndex);
        if (currentEl) currentEl.classList.remove('active');

        S.currentStep = stepIndex - 1;
        const prevEl = document.getElementById('step-' + S.currentStep);
        if (prevEl) prevEl.classList.add('active');

        window.updateProgressBar(S.currentStep, S.totalSteps);
        localStorage.setItem('franchise_form_step', String(S.currentStep));
        setTimeout(window.scrollToTopForm, 100);
    };

    window.validateStep = function (stepIndex) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'preview') return true;

        const currentStepDiv = document.getElementById('step-' + stepIndex);
        if (!currentStepDiv) {
            console.error('[Navigation] Step', stepIndex, 'not found!');
            return true;
        }

        const inputs = currentStepDiv.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        const invalidFields = [];

        inputs.forEach((input) => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
                input.classList.add('is-invalid');
                invalidFields.push(input.name || input.id || 'unknown');
                console.warn('[Navigation] Invalid field:', input.name || input.id, 'Value:', input.value);
            }
        });

        if (!isValid) {
            console.error('[Navigation] Validation failed for step', stepIndex, '- Invalid fields:', invalidFields);
            return false;
        }

        console.log('[Navigation] Step', stepIndex, 'validation passed!');

        if (isValid && stepIndex === 2) {
            const elCapex = document.getElementById('fee_capex');
            const elConstruct = document.getElementById('fee_construction');
            const valCapex = window.cleanNumber(elCapex ? elCapex.value : '');
            const valConstruct = window.cleanNumber(elConstruct ? elConstruct.value : '');

            if (valCapex === 0 && valConstruct === 0) {
                const confirmZero = confirm('⚠️ Modal Awal Rp 0? Pastikan benar.');
                if (!confirmZero) {
                    if (elCapex) elCapex.focus();
                    return false;
                }
            }
        }

        return isValid;
    };
})(window);
