document.addEventListener("DOMContentLoaded", function() {
    const appMount = document.getElementById("rocola-app-mount");
    const productGrid = document.getElementById("productGrid");

    if (!appMount || !productGrid) return;

    // Display the app mount which might have been hidden by CSS originally
    appMount.style.display = 'flex';

    const lang = document.documentElement.lang || 'hy';
    const csvPath = `/assets/inventory_${lang}.csv`;

    let allProducts = [];

    // UI Elements
    const minPriceNum = document.getElementById("minPriceNum");
    const maxPriceNum = document.getElementById("maxPriceNum");
    const minPriceBar = document.getElementById("minPriceBar");
    const maxPriceBar = document.getElementById("maxPriceBar");
    const sortOrder = document.getElementById("sortOrder");

    // Fetch and Parse CSV
    fetch(csvPath)
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return;

            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(','); // match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (data && data.length >= 4) {
                    allProducts.push({
                        code: data[0].replace(/(^"|"$)/g, ''),
                        name: data[1].replace(/(^"|"$)/g, ''),
                        price: parseFloat(data[2].replace(/(^"|"$)/g, '')),
                        unit: data[3].replace(/(^"|"$)/g, '')
                    });
                }
            }

            // Dynamically set slider limits based on actual inventory prices
            if (allProducts.length > 0) {
                const prices = allProducts.map(p => p.price);
                const maxP = Math.ceil(Math.max(...prices));
                const minP = Math.floor(Math.min(...prices));

                minPriceNum.min = minPriceBar.min = minP;
                minPriceNum.max = minPriceBar.max = maxP;
                maxPriceNum.min = maxPriceBar.min = minP;
                maxPriceNum.max = maxPriceBar.max = maxP;

                // Initialize default values
                minPriceNum.value = minPriceBar.value = minP;
                maxPriceNum.value = maxPriceBar.value = maxP;
            }

            renderProducts();
        })
        .catch(error => {
            console.error("Error loading inventory:", error);
            productGrid.innerHTML = "<p>Error loading products.</p>";
        });

    // Synchronize inputs and sliders
    function syncFilters(e) {
        if (e.target.id === 'minPriceBar') {
            minPriceNum.value = minPriceBar.value;
        } else if (e.target.id === 'maxPriceBar') {
            maxPriceNum.value = maxPriceBar.value;
        } else if (e.target.id === 'minPriceNum') {
            minPriceBar.value = minPriceNum.value || minPriceBar.min;
        } else if (e.target.id === 'maxPriceNum') {
            maxPriceBar.value = maxPriceNum.value || maxPriceBar.max;
        }

        // Prevent minimum from exceeding maximum
        if (parseFloat(minPriceBar.value) > parseFloat(maxPriceBar.value)) {
            if (e.target.id.includes('min')) {
                minPriceBar.value = maxPriceBar.value;
                minPriceNum.value = maxPriceBar.value;
            } else {
                maxPriceBar.value = minPriceBar.value;
                maxPriceNum.value = minPriceBar.value;
            }
        }

        renderProducts();
    }

    // Attach Event Listeners
    [minPriceNum, maxPriceNum, minPriceBar, maxPriceBar].forEach(el => {
        el.addEventListener('input', syncFilters);
    });

    sortOrder.addEventListener('change', renderProducts);

    // Render Function
    function renderProducts() {
        const minP = parseFloat(minPriceNum.value) || 0;
        const maxP = parseFloat(maxPriceNum.value) || Infinity;
        const sortVal = sortOrder.value;

        // Apply Price Filter
        let filtered = allProducts.filter(p => p.price >= minP && p.price <= maxP);

        // Apply Alphabetical Sort
        filtered.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return sortVal === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        // Generate HTML
        if (filtered.length === 0) {
            productGrid.innerHTML = "<p>Այս գնային միջակայքում ապրանքներ չեն գտնվել (No products found in this price range).</p>";
            return;
        }

        let html = '<div class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">';
        filtered.forEach(item => {
            html += `
                <div class="product-card" style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px;">
                    <div class="product-info">
                        <span class="product-sku" style="font-size: 0.8rem; color: #666;">#${item.code}</span>
                        <h3 class="product-title" style="margin: 0.5rem 0; font-size: 1.1rem;">${item.name}</h3>
                        <div class="product-price" style="font-weight: bold; color: #2c3e50;">
                            ${item.price.toFixed(2)} ֏ <span class="product-unit" style="font-size: 0.9rem; font-weight: normal;">/ ${item.unit}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        productGrid.innerHTML = html;
    }
});
