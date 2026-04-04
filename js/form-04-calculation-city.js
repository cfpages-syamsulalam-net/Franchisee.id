(function (window) {
    const FF = window.FranchiseForm = window.FranchiseForm || {};
    const S = FF.state;

    function calculateAll() {
        const elTotalHidden = document.getElementById('total_investment_value');
        const elOmzet = document.getElementById('omzet_monthly');
        const elProfitPercent = document.getElementById('net_profit_percent');
        const bepDisplayText = document.getElementById('bep_display_text');
        const bepValueHidden = document.getElementById('bep_value');
        const bepYearsDisplay = document.getElementById('bep_years_display');

        if (!elTotalHidden || !elOmzet || !elProfitPercent || !bepDisplayText) return;

        const totalModal = parseFloat(elTotalHidden.value) || 0;
        const omzet = window.cleanNumber(elOmzet.value);
        const marginPercent = parseFloat(elProfitPercent.value) || 0;

        if (totalModal > 0 && omzet > 0 && marginPercent > 0) {
            const operationalProfit = omzet * (marginPercent / 100);
            if (operationalProfit > 0) {
                const bepMonths = totalModal / operationalProfit;
                const formattedBEP = bepMonths.toFixed(1);
                bepDisplayText.innerText = formattedBEP;
                if (bepValueHidden) bepValueHidden.value = formattedBEP;
                bepDisplayText.className = 'fw-800 ' + (bepMonths > 24 ? 'text-warning' : 'text-success');
                if (bepYearsDisplay) bepYearsDisplay.innerText = `(± ${(bepMonths / 12).toFixed(1)} Tahun)`;
            } else {
                bepDisplayText.innerText = '∞';
            }
        } else {
            bepDisplayText.innerText = '-';
        }
    }

    window.updateMinCapital = function () {
        const elTotalDisplay = document.getElementById('total_display_text');
        const elTotalHidden = document.getElementById('total_investment_value');
        if (!elTotalDisplay || !elTotalHidden) return;

        const prices = document.querySelectorAll('.pkg-price');
        let minPrice = Infinity;
        let found = false;

        prices.forEach((el) => {
            const val = window.cleanNumber(el.value);
            if (val > 0) {
                if (val < minPrice) minPrice = val;
                found = true;
            }
        });

        if (found && minPrice !== Infinity) {
            elTotalDisplay.innerText = window.formatRupiah(minPrice);
            elTotalHidden.value = minPrice;
        } else {
            elTotalDisplay.innerText = '0';
            elTotalHidden.value = 0;
        }

        calculateAll();
    };

    FF.loadCitiesData = async function () {
        const sources = [
            '/json/data-kota-id.json',
            'https://cekkode.github.io/json/data-kota-id.json'
        ];

        for (const source of sources) {
            try {
                const res = await fetch(source);
                if (!res.ok) continue;
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    S.citiesData = data;
                    FF.initCityAutocomplete();
                    return;
                }
            } catch (_) {
                // Continue to next source.
            }
        }

        console.error('❌ Failed to load city autocomplete JSON from all sources.');
    };

    FF.initCityAutocomplete = function () {
        document.querySelectorAll('.city-autocomplete').forEach((input) => {
            if (input.dataset.acInitialized) return;
            input.dataset.acInitialized = 'true';

            const listContainer = document.createElement('div');
            listContainer.className = 'city-suggestions';
            input.parentNode.appendChild(listContainer);

            input.addEventListener('input', function () {
                const val = this.value;
                listContainer.innerHTML = '';
                if (!val || S.citiesData.length === 0) {
                    listContainer.style.display = 'none';
                    return;
                }

                const matches = S.citiesData
                    .filter((city) => city.toLowerCase().includes(val.toLowerCase()))
                    .slice(0, 10);

                if (matches.length > 0) {
                    matches.forEach((city) => {
                        const item = document.createElement('div');
                        item.className = 'city-suggestion-item';
                        item.innerHTML = city.replace(new RegExp(`(${val})`, 'gi'), '<strong>$1</strong>');
                        item.addEventListener('mousedown', (e) => {
                            e.preventDefault();
                            input.value = city;
                            listContainer.style.display = 'none';
                        });
                        listContainer.appendChild(item);
                    });
                    listContainer.style.display = 'block';
                } else {
                    listContainer.style.display = 'none';
                }
            });

            input.addEventListener('blur', () => setTimeout(() => {
                listContainer.style.display = 'none';
            }, 150));
        });
    };

    FF.initCalculationAndCity = function () {
        document.querySelectorAll('.calc-bep').forEach((el) => {
            el.addEventListener('input', calculateAll);
            el.addEventListener('change', calculateAll);
        });
        FF.loadCitiesData();
    };
})(window);
