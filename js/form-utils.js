/**
 * /js/form-utils.js
 * Restored Shared Utilities for Franchise.id Forms
 */

/**
 * Smart title case for names
 * Handles exceptions: bin, binti, al, ar, etc.
 * Preserves existing titles/capitalization
 */
window.autoTitleCase = function(name) {
    if (!name || typeof name !== 'string') return name;
    
    // Common titles/particles that should remain lowercase in names
    const lowercaseParticles = new Set([
        'bin', 'binti', 'al', 'ar', 'van', 'de', 'der', 'den', 'von', 'zu',
        'di', 'da', 'del', 'los', 'las', 'y', 'e', 'o'
    ]);
    
    // Check if name contains obvious titles
    const titlePattern = /\b(dr|drs|drh|ir|h|hj|hj|prof|t Hj|Tn|Ny)\b/gi;
    const hasTitle = titlePattern.test(name);
    
    if (hasTitle) {
        // Capitalize first letter of each word, preserve existing caps
        return name.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    // Split name into words
    const words = name.split(/\s+/);
    const result = words.map((word, index) => {
        const lowerWord = word.toLowerCase();
        
        // Keep particle lowercase (except first word)
        if (index > 0 && lowercaseParticles.has(lowerWord)) {
            return lowerWord;
        }
        
        // Capitalize first letter
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    return result.join(' ');
};

/**
 * Format phone number to Indonesian style: 812-3456-7890
 * Accepts: 812345678900123 or any format
 */
window.formatWhatsAppNumber = function(phone) {
    if (!phone) return '';
    
    // Strip all non-digits
    let digits = phone.toString().replace(/\D/g, '');
    
    // Remove leading zero if present
    if (digits.startsWith('0')) {
        digits = digits.substring(1);
    }
    
    // Validate length
    if (digits.length < 9 || digits.length > 13) {
        return digits; // Return as-is if invalid length
    }
    
    // Format: XXX-XXXX-XXXX (adjustable based on length)
    if (digits.length <= 4) {
        return digits;
    } else if (digits.length <= 8) {
        return digits.slice(0, 3) + '-' + digits.slice(3);
    } else if (digits.length <= 11) {
        return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
    } else {
        return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7, 11);
    }
};

window.scrollToTopForm = function() {
    const formWrapper = document.querySelector('.registration-tabs-wrapper');
    if (!formWrapper) return;
    const headerOffset = 140;
    const elementPosition = formWrapper.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}

/**
 * Bind auto-formatting for specific fields
 * Should be called once on DOM ready
 */
window.bindAutoFormatting = function() {
    // Auto title-case name fields on blur
    document.querySelectorAll('input[name="name"], input[name="brand_name"], input[name="pic_name"], input[name="company_name"]').forEach((input) => {
        input.addEventListener('blur', function() {
            if (this.value && this.value.trim() !== '') {
                const original = this.value.trim();
                const formatted = window.autoTitleCase(original);
                
                if (formatted !== original) {
                    this.value = formatted;
                    console.log('[AutoFormat] Name formatted:', original, '→', formatted);
                    
                    // Visual feedback: flash highlight
                    if (typeof window.flashHighlight === 'function') {
                        window.flashHighlight(this);
                    }
                    
                    // Trigger validation to update visual state
                    if (typeof window.validateSpecificField === 'function') {
                        window.validateSpecificField(this);
                    }
                }
            }
        });
    });

    // Auto-format WhatsApp numbers on blur
    document.querySelectorAll('input[name="whatsapp"]').forEach((input) => {
        input.addEventListener('blur', function() {
            if (this.value && this.value.trim() !== '') {
                const raw = this.value.trim();
                const formatted = window.formatWhatsAppNumber(raw);
                
                if (formatted !== raw && formatted.length >= 9) {
                    this.value = formatted;
                    console.log('[AutoFormat] Phone formatted:', raw, '→', formatted);
                    
                    // Visual feedback: flash highlight
                    if (typeof window.flashHighlight === 'function') {
                        window.flashHighlight(this);
                    }
                    
                    // Trigger validation to update visual state
                    if (typeof window.validateSpecificField === 'function') {
                        window.validateSpecificField(this);
                    }
                }
            }
        });
    });
};

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
        else if (field.type === 'email' || name === 'email' || name === 'email_contact') {
            // Strict email validation with specific error messages
            const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(val)) {
                isValid = false;
                
                // Provide specific error messages based on what's wrong
                if (!val.includes('@')) {
                    errorMsg = "Email harus mengandung tanda @. Contoh: nama@domain.com";
                } else if (!val.includes('.') || val.indexOf('.') < val.indexOf('@') + 2) {
                    errorMsg = "Email harus mengandung domain yang valid. Contoh: nama@domain.com";
                } else if (val.includes(' ')) {
                    errorMsg = "Email tidak boleh mengandung spasi. Contoh: nama@domain.com";
                } else {
                    errorMsg = "Format email salah. Contoh yang benar: nama@domain.com";
                }
            }
        }
        else if (field.classList.contains('phone-format') || name === 'whatsapp') {
            // WhatsApp validation and auto-formatting
            const digits = val.replace(/\D/g, '');
            if (digits.length < 9 || digits.length > 13) {
                isValid = false;
                errorMsg = "Nomor WA harus 9-13 digit. Contoh: 812-3456-7890";
            } else if (!val.includes('-') && digits.length >= 9) {
                // Auto-format: add dashes if user typed without them
                const formatted = window.formatWhatsAppNumber(digits);
                if (formatted !== val) {
                    field.value = formatted;
                }
            }
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
