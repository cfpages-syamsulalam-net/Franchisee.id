(function (window) {
    window.TestDataGenerator = {
        isDevMode: function() {
            return new URLSearchParams(window.location.search).get('dev') === '1';
        },

        // ==================== DATA GENERATORS ====================

        generateName: function() {
            const firstNames = [
                'Budi', 'Siti', 'Ahmad', 'Dewi', 'Rizky', 'Rina', 'Agus', 'Putri',
                'Eko', 'Nur', 'Hendra', 'Lestari', 'Yudi', 'Ratna', 'Fajar', 'Indah',
                'Dimas', 'Wulan', 'Arif', 'Maya', 'Bambang', 'Sri', 'Joko', 'Ani',
                'Teguh', 'Fitri', 'Andi', 'Reni', 'Susanto', 'Yuliana', 'Bayu', 'Dian'
            ];
            const lastNames = [
                'Pratama', 'Wijaya', 'Sari', 'Putra', 'Hidayat', 'Kusuma', 'Santoso',
                'Purnama', 'Lestari', 'Susanti', 'Hermawan', 'Wahyuni', 'Setiawan',
                'Rahayu', 'Nugroho', 'Utami', 'Firmansyah', 'Handayani', 'Saputra',
                'Maulida', 'Kurniawan', 'Permata', 'Yulianto', 'Dewi', 'Purnomo'
            ];
            const suffix = Math.floor(Math.random() * 999) + 1;
            return this.randomChoice(firstNames) + ' ' + this.randomChoice(lastNames) + ' ' + suffix;
        },

        generateEmail: function() {
            const suffix = Math.floor(Math.random() * 999) + 1;
            return 'test_' + suffix + '@example.com';
        },

        generatePhone: function() {
            const middle = Math.floor(Math.random() * 9000) + 1000;
            const last = Math.floor(Math.random() * 9000) + 1000;
            return '812-' + middle + '-' + last;
        },

        generateCity: function() {
            const cities = [
                'Jakarta Selatan', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Pusat',
                'Surabaya', 'Bandung', 'Semarang', 'Medan', 'Makassar',
                'Yogyakarta', 'Denpasar', 'Palembang', 'Tangerang', 'Bekasi',
                'Depok', 'Bogor', 'Malang', 'Padang', 'Pekanbaru',
                'Manado', 'Balikpapan', 'Batam', 'Samarinda', 'Bandar Lampung'
            ];
            const suffix = Math.floor(Math.random() * 999) + 1;
            return this.randomChoice(cities) + ' ' + suffix;
        },

        generateBrandName: function() {
            const prefixes = [
                'Kopi', 'Burger', 'Ayam', 'Nasi', 'Teh', 'Roti', 'Bakso', 'Sate',
                'Mie', 'Dimsum', 'Kebab', 'Pizza', 'Es Krim', 'Jajanan', 'Snack',
                'Coffeeshop', 'Warung', 'Kitchen', 'Food'
            ];
            const suffixes = [
                'Nusantara', 'Sejahtera', 'Maju', 'Bersama', 'Mandiri', 'Jaya',
                'Sentosa', 'Makmur', 'Lestari', 'Abadi', 'Harapan', 'Kreasi',
                'Pratama', 'Wijaya', 'Utama', 'Perkasa'
            ];
            const suffixNum = Math.floor(Math.random() * 999) + 1;
            return this.randomChoice(prefixes) + ' ' + this.randomChoice(suffixes) + ' ' + suffixNum;
        },

        generateCompanyName: function() {
            return 'PT ' + this.generateBrandName();
        },

        generateNIB: function() {
            let nib = '';
            for (let i = 0; i < 13; i++) {
                nib += Math.floor(Math.random() * 10);
            }
            return nib;
        },

        randomChoice: function(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },

        randomRange: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        // ==================== FORM FILLERS ====================

        fillFormFields: function(data) {
            Object.entries(data).forEach(([name, value]) => {
                const field = document.querySelector(`[name="${name}"]`);
                if (field) {
                    const type = field.type ? field.type.toLowerCase() : '';
                    
                    if (type === 'radio') {
                        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
                        if (radio) {
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } else if (type === 'checkbox') {
                        if (Array.isArray(value)) {
                            value.forEach(v => {
                                const cb = document.querySelector(`input[name="${name}"][value="${v}"]`);
                                if (cb) {
                                    cb.checked = true;
                                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            });
                        }
                    } else if (field.tagName === 'SELECT') {
                        field.value = value;
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        field.value = value;
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                        field.dispatchEvent(new Event('change', { bubbles: true }));
                        field.dispatchEvent(new Event('blur', { bubbles: true }));
                    }
                }
            });
        },

        markFormAsTestData: function(formId) {
            const form = document.getElementById(formId);
            if (!form) return;
            
            let testFlag = form.querySelector('input[name="is_test_data"]');
            if (!testFlag) {
                testFlag = document.createElement('input');
                testFlag.type = 'hidden';
                testFlag.name = 'is_test_data';
                form.appendChild(testFlag);
            }
            testFlag.value = 'TRUE';
        },

        fillFranchiseeForm: function() {
            console.log('[TestData] Filling Franchisee form...');
            
            // Step 1 fields
            const step1Data = {
                name: this.generateName(),
                city_origin: this.generateCity(),
                country_code: '+62',
                whatsapp: this.generatePhone(),
                email: this.generateEmail()
            };
            
            // Step 2 fields
            const step2Data = {
                interest_category: this.randomChoice(['fb', 'retail', 'service', 'edu', 'beauty']),
                budget_range: this.randomChoice(['<50jt', '50-100jt', '100-500jt', '>500jt']),
                location_plan: this.randomChoice(['ready', 'searching']),
                message: 'Generated test data for validation'
            };
            
            // Fill Step 1
            this.fillFormFields(step1Data);
            
            // Navigate to Step 2 if on Step 1
            if (typeof window.franchiseeNextStep === 'function') {
                window.franchiseeNextStep(2);
            }
            
            // Fill Step 2
            this.fillFormFields(step2Data);
            
            // Navigate back to Step 1 for user review
            setTimeout(() => {
                if (typeof window.franchiseePrevStep === 'function') {
                    window.franchiseePrevStep(2);
                }
                
                this.markFormAsTestData('franchiseeForm');
                this.showToast('✅ Franchisee form filled (both steps)! Review and click LANJUT.');
            }, 100);
        },

        fillFranchisorForm: function() {
            console.log('[TestData] Filling Franchisor form...');
            
            const brandName = this.generateBrandName();
            const data = {
                // Step 1: Identitas & Legalitas
                brand_name: brandName,
                company_name: this.generateCompanyName(),
                category: this.randomChoice(['fb', 'retail', 'service', 'edu', 'beauty']),
                year_established: String(this.randomRange(2015, 2024)),
                haki_status: 'registered',
                haki_number: 'IDM000' + this.randomRange(100, 999),
                nib_number: this.generateNIB(),
                
                // Step 2: Konsep & Biaya
                outlet_type: this.randomChoice(['A', 'B', 'C', 'D']),
                location_requirement: '3x4 meter',
                rent_cost: '1000000',
                fee_license: '5000000',
                fee_capex: '15000000',
                fee_construction: '10000000',
                net_profit_percent: '30',
                royalty_percent: '5',
                royalty_basis: 'omzet',
                
                // Step 3: Profil Marketing
                short_desc: 'Test franchise ' + this.randomRange(1, 999),
                full_desc: 'Auto-generated test data for validation testing.',
                
                // Step 4: Media & Visual
                logo_url: 'https://res.cloudinary.com/test/logo.png',
                cover_url: 'https://res.cloudinary.com/test/cover.jpg',
                
                // Step 5: Kontak
                pic_name: this.generateName(),
                country_code: '+62',
                whatsapp: this.generatePhone(),
                email_contact: this.generateEmail(),
                website_url: 'https://example.com',
                instagram_url: '@test_' + this.randomRange(1, 999)
            };
            
            this.fillFormFields(data);
            this.markFormAsTestData('franchiseListingForm');
            this.showToast('✅ Franchisor form filled (all 5 steps)! Navigate and submit.');
        },

        fillClaimForm: async function() {
            console.log('[TestData] Filling Claim form...');
            
            const brandName = 'Test Brand ' + this.randomRange(1, 999);
            const unclaimedData = {
                brand_name: brandName,
                category: this.randomChoice(['F&B', 'Retail', 'Jasa', 'Pendidikan']),
                min_capital: String(this.randomRange(50, 500)) + '000000',
                city: this.generateCity(),
                is_test_data: 'TRUE'
            };
            
            try {
                // Try to create UNCLAIMED row via backend
                const response = await fetch('/form-submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        test_action: 'create_unclaimed',
                        is_test_data: true,
                        ...unclaimedData
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Search for the brand
                    const searchInput = document.querySelector('#claim-brand-search');
                    if (searchInput) {
                        searchInput.value = brandName;
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Wait and select first match
                        setTimeout(() => {
                            const suggestion = document.querySelector('.suggestion-item');
                            if (suggestion) {
                                suggestion.click();
                                this.showToast('✅ Claim form ready! Submit to test workflow.');
                            } else {
                                this.showToast('⚠️ Brand not found in autocomplete. Try manually.');
                            }
                        }, 800);
                    }
                } else {
                    this.showToast('❌ Failed to create UNCLAIMED: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('[TestData] Error creating UNCLAIMED:', error);
                this.showToast('❌ Network error. Check console.');
            }
        },

        clearAllTestData: async function() {
            if (!confirm('⚠️ This will delete ALL test data from Google Sheets (rows with is_test_data=TRUE). Continue?')) {
                return;
            }
            
            try {
                const response = await fetch('/form-submit?test_action=clear_test_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        test_action: 'clear_test_data'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showToast('✅ Cleared ' + (result.deleted || 0) + ' test records!');
                } else {
                    this.showToast('❌ Failed: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('[TestData] Error clearing test data:', error);
                this.showToast('❌ Network error. Check console.');
            }
        },

        // ==================== UI ====================

        showToast: function(message) {
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 60px;
                left: 12px;
                background: #7c3aed;
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 13px;
                z-index: 99999;
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                max-width: 280px;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-10px)';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        },

        createFAB: function() {
            if (!this.isDevMode()) return;
            
            // Prevent duplicate FAB
            if (document.getElementById('dev-test-generator-fab')) return;
            
            const fabContainer = document.createElement('div');
            fabContainer.id = 'dev-test-generator-fab';
            fabContainer.style.cssText = 'display:block !important; position:fixed; bottom:12px; left:12px; z-index:100000;';
            fabContainer.innerHTML = `
                <button id="dev-generator-toggle" title="Test Data Generator" style="
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    width:30px;
                    height:30px;
                    border-radius:50%;
                    background:#7c3aed;
                    color:#fff;
                    border:none;
                    text-decoration:none;
                    font-size:16px;
                    opacity:0.9;
                    box-shadow:0 2px 8px rgba(0,0,0,0.2);
                    cursor:pointer;
                    padding:0;
                    margin:0;
                ">⚡</button>
                <div id="dev-generator-menu" style="
                    position: absolute;
                    bottom: 40px;
                    left: 0;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                    padding: 8px 0;
                    min-width: 260px;
                    display: none;
                ">
                    <button id="dev-fill-franchisee">🚀 Fill Franchisee Form</button>
                    <button id="dev-fill-franchisor">🏢 Fill Franchisor Form</button>
                    <button id="dev-fill-claim">🔍 Fill Claim + Create UNCLAIMED</button>
                    <button id="dev-clear-test-data" style="border-top: 1px solid #eee; color: #dc3545;">🗑️ Clear All Test Data</button>
                </div>
            `;
            
            // Insert right after debug-mode-toggle
            const debugToggle = document.getElementById('debug-mode-toggle');
            if (debugToggle && debugToggle.parentNode) {
                debugToggle.parentNode.insertBefore(fabContainer, debugToggle.nextSibling);
            } else {
                document.body.appendChild(fabContainer);
            }
            
            // Bind events
            const toggle = document.getElementById('dev-generator-toggle');
            const menu = document.getElementById('dev-generator-menu');
            
            toggle.addEventListener('mouseenter', () => {
                toggle.style.opacity = '1';
            });
            
            toggle.addEventListener('mouseleave', () => {
                toggle.style.opacity = '0.9';
            });
            
            toggle.addEventListener('click', () => {
                menu.classList.toggle('active');
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
            
            document.getElementById('dev-fill-franchisee').addEventListener('click', () => {
                this.fillFranchiseeForm();
                menu.classList.remove('active');
            });
            
            document.getElementById('dev-fill-franchisor').addEventListener('click', () => {
                this.fillFranchisorForm();
                menu.classList.remove('active');
            });
            
            document.getElementById('dev-fill-claim').addEventListener('click', () => {
                this.fillClaimForm();
                menu.classList.remove('active');
            });
            
            document.getElementById('dev-clear-test-data').addEventListener('click', () => {
                this.clearAllTestData();
                menu.classList.remove('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!fabContainer.contains(e.target)) {
                    menu.classList.remove('active');
                }
            });
            
            console.log('[TestData] FAB created and ready');
        },

        init: function() {
            if (!this.isDevMode()) {
                console.log('[TestData] Dev mode not active, skipping');
                return;
            }
            console.log('[TestData] Initializing test data generator...');
            this.createFAB();
            console.log('[TestData] FAB created successfully! Look for ⚡ button at bottom-left.');
        }
    };

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[TestData] DOM loaded, checking dev mode...');
            window.TestDataGenerator.init();
        });
    } else {
        console.log('[TestData] DOM already ready, checking dev mode...');
        window.TestDataGenerator.init();
    }
})(window);
