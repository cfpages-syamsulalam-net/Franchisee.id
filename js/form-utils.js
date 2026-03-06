/**
 * /js/form-utils.js
 * Restored Shared Utilities for Franchise.id Forms
 */

window.scrollToTopForm = function() {
    const formWrapper = document.querySelector('.registration-tabs-wrapper'); 
    if (!formWrapper) return;
    const headerOffset = 140;		   
    const elementPosition = formWrapper.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}

window.updateProgressBar = function(step, totalSteps) {
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
    const pb = document.getElementById('main_progress_bar');
    if(pb) pb.style.width = percent + '%';
}

window.formatRupiah = function(angka) {
    if (!angka) return '';
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

window.cleanNumber = function(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.toString().replace(/\./g, '')) || 0;
}

window.flashHighlight = function(element) {
    element.style.transition = "background-color 0.3s";
    element.style.backgroundColor = "#fff3cd"; 
    setTimeout(() => { element.style.backgroundColor = ""; }, 800);
}

window.showErrorMsg = function(inputField, msg) {
    window.removeErrorMsg(inputField);
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

window.removeErrorMsg = function(inputField) {
    const parent = inputField.closest('.input-col') || inputField.parentElement;
    if(parent) {
        const existingMsg = parent.querySelector('.validation-error-msg');
        if (existingMsg) existingMsg.remove();
    }
}

window.validateSpecificField = function(field) {
    if (field.offsetParent === null) return;

    let isValid = true;
    let errorMsg = "";
    const val = field.value.trim();
    const name = field.name;

    if (!field.hasAttribute('required') && val === '') {
        field.classList.remove('is-valid', 'is-invalid');
        window.removeErrorMsg(field);
        return true; 
    }

    if (field.hasAttribute('required') && val === '') {
        isValid = false; errorMsg = "Wajib diisi.";
    } 
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

    if (isValid) {
        field.classList.add('is-valid');
        field.classList.remove('is-invalid');
        window.removeErrorMsg(field);
    } else {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        window.showErrorMsg(field, errorMsg);
    }
    return isValid;
};
