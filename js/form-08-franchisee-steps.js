(function (window) {
    // Franchisee form state (separate from franchisor)
    const franchiseeState = {
        currentStep: 1,
        totalSteps: 2
    };

    // Navigate to next step in franchisee form
    window.franchiseeNextStep = function (stepIndex) {
        // Validate the CURRENT step (stepIndex - 1) before proceeding to stepIndex
        const currentStepToValidate = stepIndex - 1;
        
        console.log('[Franchisee Steps] Validating step', currentStepToValidate, 'before moving to step', stepIndex);
        
        if (!validateFranchiseeStep(currentStepToValidate)) {
            console.warn('[Franchisee Steps] Validation failed for step', currentStepToValidate);
            return;
        }

        // Hide current step
        const currentEl = document.getElementById('franchisee-step-' + currentStepToValidate);
        if (currentEl) {
            currentEl.classList.remove('active');
            currentEl.style.display = 'none';
        }

        // Show next step
        franchiseeState.currentStep = stepIndex;
        const nextEl = document.getElementById('franchisee-step-' + franchiseeState.currentStep);
        if (nextEl) {
            nextEl.classList.add('active');
            nextEl.style.display = 'block';
            console.log('[Franchisee Steps] Step', franchiseeState.currentStep, 'now visible');
        } else {
            console.error('[Franchisee Steps] Could not find element: franchisee-step-' + franchiseeState.currentStep);
        }

        // Update progress bar
        updateFranchiseeProgressBar();
        
        // Save step to localStorage for restoration
        localStorage.setItem('franchisee_form_step', String(franchiseeState.currentStep));
        
        // Scroll to top
        setTimeout(() => {
            if (typeof window.scrollToTopForm === 'function') {
                window.scrollToTopForm();
            }
        }, 100);
    };

    // Navigate to previous step in franchisee form
    window.franchiseePrevStep = function (stepIndex) {
        // stepIndex is the current step you're on, going back to stepIndex - 1
        const targetStep = stepIndex - 1;
        
        console.log('[Franchisee Steps] Going back from step', stepIndex, 'to step', targetStep);

        // Hide current step
        const currentEl = document.getElementById('franchisee-step-' + stepIndex);
        if (currentEl) {
            currentEl.classList.remove('active');
            currentEl.style.display = 'none';
        }

        // Show previous step
        franchiseeState.currentStep = targetStep;
        const prevEl = document.getElementById('franchisee-step-' + franchiseeState.currentStep);
        if (prevEl) {
            prevEl.classList.add('active');
            prevEl.style.display = 'block';
            console.log('[Franchisee Steps] Step', franchiseeState.currentStep, 'now visible');
        }

        // Update progress bar
        updateFranchiseeProgressBar();
        
        // Save step to localStorage
        localStorage.setItem('franchisee_form_step', String(franchiseeState.currentStep));
        
        // Scroll to top
        setTimeout(() => {
            if (typeof window.scrollToTopForm === 'function') {
                window.scrollToTopForm();
            }
        }, 100);
    };

    // Validate franchisee form step
    function validateFranchiseeStep (stepIndex) {
        const currentStepDiv = document.getElementById('franchisee-step-' + stepIndex);
        if (!currentStepDiv) return true;

        const inputs = currentStepDiv.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        let firstInvalidField = null;

        inputs.forEach((input) => {
            // Use the existing validateSpecificField function for better error messages
            if (typeof window.validateSpecificField === 'function') {
                const fieldValid = window.validateSpecificField(input);
                if (!fieldValid) {
                    isValid = false;
                    if (!firstInvalidField) {
                        firstInvalidField = input;
                    }
                }
            } else {
                // Fallback to basic HTML validation
                if (!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                    input.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = input;
                    }
                } else {
                    input.classList.remove('is-invalid');
                }
            }
        });

        // Focus on first invalid field and scroll to it
        if (!isValid && firstInvalidField) {
            firstInvalidField.focus();
            firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    }

    // Update progress bar for franchisee form
    function updateFranchiseeProgressBar () {
        const progressBar = document.getElementById('franchisee_progress_bar');
        if (progressBar) {
            const percent = (franchiseeState.currentStep / franchiseeState.totalSteps) * 100;
            progressBar.style.width = percent + '%';
        }

        // Update step indicators
        document.querySelectorAll('#tab-franchisee .step-item').forEach((item) => {
            const step = parseInt(item.getAttribute('data-step'), 10);
            item.classList.remove('active', 'completed');
            
            if (step === franchiseeState.currentStep) {
                item.classList.add('active');
            } else if (step < franchiseeState.currentStep) {
                item.classList.add('completed');
            }
        });
    }

    // Restore saved step on page load
    function restoreFranchiseeStep () {
        const savedStep = localStorage.getItem('franchisee_form_step');
        if (savedStep && parseInt(savedStep, 10) > 1) {
            const stepNum = parseInt(savedStep, 10);
            
            // Hide step 1
            const step1 = document.getElementById('franchisee-step-1');
            if (step1) {
                step1.classList.remove('active');
                step1.style.display = 'none';
            }

            // Show saved step
            franchiseeState.currentStep = stepNum;
            const stepEl = document.getElementById('franchisee-step-' + stepNum);
            if (stepEl) {
                stepEl.classList.add('active');
                stepEl.style.display = 'block';
            }

            updateFranchiseeProgressBar();
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        restoreFranchiseeStep();
    });
})(window);
