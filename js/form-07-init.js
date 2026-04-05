document.addEventListener('DOMContentLoaded', function () {
    const FF = window.FranchiseForm = window.FranchiseForm || {};

    if (typeof FF.initClaimSearchBindings === 'function') FF.initClaimSearchBindings();
    if (typeof FF.initCalculationAndCity === 'function') FF.initCalculationAndCity();
    if (typeof FF.loadCountryCodeOptions === 'function') FF.loadCountryCodeOptions();
    if (typeof FF.initFormSubmission === 'function') FF.initFormSubmission();
    if (typeof window.bindAutoFormatting === 'function') window.bindAutoFormatting();

    // HAKI number visibility toggle
    const hakiRadios = document.querySelectorAll('input[name="haki_status"]');
    const hakiWrapper = document.getElementById('haki_number_wrapper');
    if (hakiRadios.length > 0 && hakiWrapper) {
        hakiRadios.forEach((radio) => {
            radio.addEventListener('change', function () {
                if (this.value === 'registered' || this.value === 'process') {
                    hakiWrapper.classList.remove('d-none');
                } else {
                    hakiWrapper.classList.add('d-none');
                    // Clear value when hidden
                    const hakiInput = hakiWrapper.querySelector('input[name="haki_number"]');
                    if (hakiInput) hakiInput.value = '';
                }
            });
        });
    }

    const savedStep = localStorage.getItem('franchise_form_step');
    if (savedStep && parseInt(savedStep, 10) > 1) {
        const firstStep = document.getElementById('step-1');
        if (firstStep) firstStep.classList.remove('active');

        const parsedStep = parseInt(savedStep, 10);
        FF.state.currentStep = parsedStep;
        const targetEl = document.getElementById('step-' + parsedStep);
        if (targetEl) {
            targetEl.classList.add('active');
            window.updateProgressBar(parsedStep, FF.state.totalSteps || 5);
        }
    }

    const lastTab = localStorage.getItem('active_registration_tab');
    const claimState = typeof FF.getClaimModeState === 'function' ? FF.getClaimModeState() : null;
    const urlParams = new URLSearchParams(window.location.search);

    if (claimState && claimState.active && claimState.brand && typeof FF.fillMainFranchisorForm === 'function') {
        FF.fillMainFranchisorForm(claimState.brand, { persist: false, skipScroll: true });
    } else if (urlParams.get('claim')) {
        window.openTab('klaim');
    } else if (lastTab) {
        window.openTab(lastTab);
    } else {
        window.openTab('franchisee');
    }

    window.fetchUnclaimedBrands = FF.fetchUnclaimedBrands;
    window.fillMainFranchisorForm = FF.fillMainFranchisorForm;
});
