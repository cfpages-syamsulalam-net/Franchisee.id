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
    const roleParam = normalizePublicRole(urlParams.get('role'));

    if (claimState && claimState.active && claimState.brand && typeof FF.fillMainFranchisorForm === 'function') {
        FF.fillMainFranchisorForm(claimState.brand, { persist: false, skipScroll: true });
    } else if (urlParams.get('claim')) {
        window.openTab('klaim');
    } else if (roleParam) {
        window.openTab(roleParam);
    } else if (lastTab) {
        window.openTab(lastTab);
    } else {
        window.openTab('franchisee');
    }

    enforceDaftarAuthAndPrefill();

    window.fetchUnclaimedBrands = FF.fetchUnclaimedBrands;
    window.fillMainFranchisorForm = FF.fillMainFranchisorForm;

    async function enforceDaftarAuthAndPrefill() {
        if (!window.FranchiseAuth || typeof window.FranchiseAuth.init !== 'function') return;
        try {
            const clerk = await window.FranchiseAuth.init();
            if (!clerk || !clerk.session) {
                redirectToLogin();
                return;
            }

            const user = typeof window.FranchiseAuth.syncUser === 'function'
                ? await window.FranchiseAuth.syncUser()
                : null;
            prefillKnownIdentity(clerk, user);
            await redirectCompletedProfileIfNeeded(urlParams, roleParam, claimState);
            updateDaftarHeading(true);
        } catch (error) {
            console.warn('[FranchiseForm] Auth check failed:', error && error.message ? error.message : error);
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        const current = window.location.pathname + window.location.search + window.location.hash;
        const target = new URL('/login/', window.location.origin);
        target.searchParams.set('next', current || '/daftar/');
        window.location.href = target.pathname + target.search;
    }

    function prefillKnownIdentity(clerk, user) {
        const email = user?.email || clerk?.user?.primaryEmailAddress?.emailAddress || '';
        const name = user?.display_name || clerk?.user?.fullName || clerk?.user?.firstName || '';
        lockIdentityValue('#franchiseeForm input[name="email"]', email);
        lockIdentityValue('#franchiseeForm input[name="name"]', name);
        lockIdentityValue('#franchiseListingForm input[name="email_contact"]', email);
        lockIdentityValue('#franchiseListingForm input[name="pic_name"]', name);
    }

    async function redirectCompletedProfileIfNeeded(currentParams, selectedRole, activeClaimState) {
        if (currentParams.get('force') === '1' || currentParams.get('claim') || currentParams.get('dev') === '1') return;
        if (activeClaimState && activeClaimState.active) return;
        if (!window.FranchiseAuth || typeof window.FranchiseAuth.getAuthHeaders !== 'function') return;

        const headers = await window.FranchiseAuth.getAuthHeaders({ skipPendingRoleSync: true });
        if (!headers.Authorization) return;
        const response = await fetch('/profile-data', { headers });
        if (!response.ok) return;
        const profile = await response.json();
        if (!profile.success) return;

        const franchiseeComplete = Boolean(profile.completion && profile.completion.franchisee);
        const franchisorComplete = Boolean(profile.completion && profile.completion.franchisor);
        const shouldRedirect =
            (selectedRole === 'franchisee' && franchiseeComplete) ||
            (selectedRole === 'franchisor' && franchisorComplete) ||
            (!selectedRole && (franchiseeComplete || franchisorComplete));

        if (shouldRedirect) {
            window.location.replace('/profil/');
        }
    }

    function lockIdentityValue(selector, value) {
        if (!value) return;
        const field = document.querySelector(selector);
        if (!field) return;
        field.value = value;
        field.readOnly = true;
        field.setAttribute('aria-readonly', 'true');
        field.classList.add('identity-locked-field');
        field.title = 'Data ini mengikuti akun Anda. Ubah lewat halaman Profil.';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        addIdentityLockNote(field);
    }

    function addIdentityLockNote(field) {
        const parent = field.parentElement;
        if (!parent || parent.querySelector('.identity-lock-note')) return;
        const note = document.createElement('small');
        note.className = 'identity-lock-note';
        note.textContent = 'Mengikuti akun Anda. Ubah lewat Profil.';
        parent.appendChild(note);
    }

    function updateDaftarHeading(isSignedIn) {
        if (!isSignedIn) return;
        document.querySelectorAll('.elementor-heading-title').forEach((heading) => {
            if ((heading.textContent || '').trim() === 'Daftar') {
                heading.textContent = 'Lengkapi Profil';
            }
        });
    }

    function normalizePublicRole(value) {
        return value === 'franchisee' || value === 'franchisor' ? value : '';
    }
});
