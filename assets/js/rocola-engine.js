document.addEventListener("DOMContentLoaded", function() {
    const appMount = document.getElementById("rocola-app-mount");
    const productGrid = document.getElementById("productGrid");

    if (!appMount || !productGrid) return;

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
    const productCounter = document.getElementById("productCounter");

    // Click Interceptor Function for Missing Slugs (Demo Mode)
    window.handleProductClick = function(event, slug, productName) {
        if (!slug || slug === "undefined" || slug.trim() === "") {
            event.preventDefault(); // Stop navigation
            alert("⚠️ Demo Notice: The detailed page and photos for '" + productName + "' are currently under preparation.");
        }
    };

    // Fetch and Parse CSV
    fetch(csvPath)
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return;

            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');

                if (data && data.length >= 4) {
                    const fname = data.pop().replace(/(^"|"$)/g, '').trim();
                    const unit = data.pop().replace(/(^"|"$)/g, '').trim();
                    const priceStr = data.pop().replace(/(^"|"$)/g, '').trim();
                    const code = data.shift().replace(/(^"|"$)/g, '').trim();
                    const name = data.join(',').replace(/(^"|"$)/g, '').trim();

                    const priceNum = parseFloat(priceStr);
                    if (!isNaN(priceNum)) {
                        allProducts.push({ code, name, price: priceNum, unit, fname });
                    }
                }
            }

            if (allProducts.length > 0) {
                const prices = allProducts.map(p => p.price);
                const maxP = Math.ceil(Math.max(...prices));
                const minP = Math.floor(Math.min(...prices));

                minPriceNum.min = minPriceBar.min = minP;
                minPriceNum.max = minPriceBar.max = maxP;
                maxPriceNum.min = maxPriceBar.min = minP;
                maxPriceNum.max = maxPriceBar.max = maxP;

                minPriceNum.value = minPriceBar.value = minP;
                maxPriceNum.value = maxPriceBar.value = maxP;
            }

            fillSliderTrack();
            renderProducts();
        })
        .catch(error => {
            console.error("Error loading inventory:", error);
            productGrid.innerHTML = "<p>Error loading products.</p>";
        });

    function syncFilters(e) {
        let minVal = parseFloat(minPriceNum.value) || parseFloat(minPriceBar.min);
        let maxVal = parseFloat(maxPriceNum.value) || parseFloat(maxPriceBar.max);

        if (e.target.id === 'minPriceBar') {
            minVal = parseFloat(minPriceBar.value);
            if (minVal > parseFloat(maxPriceBar.value)) {
                minPriceBar.value = maxPriceBar.value;
                minVal = parseFloat(maxPriceBar.value);
            }
            minPriceNum.value = minVal;
        } else if (e.target.id === 'maxPriceBar') {
            maxVal = parseFloat(maxPriceBar.value);
            if (maxVal < parseFloat(minPriceBar.value)) {
                maxPriceBar.value = minPriceBar.value;
                maxVal = parseFloat(minPriceBar.value);
            }
            maxPriceNum.value = maxVal;
        } else if (e.target.id === 'minPriceNum') {
            if (minVal > parseFloat(maxPriceNum.value)) {
                minVal = parseFloat(maxPriceNum.value);
                minPriceNum.value = minVal;
            }
            minPriceBar.value = minVal;
        } else if (e.target.id === 'maxPriceNum') {
            if (maxVal < parseFloat(minPriceNum.value)) {
                maxVal = parseFloat(minPriceNum.value);
                maxPriceNum.value = maxVal;
            }
            maxPriceBar.value = maxVal;
        }

        fillSliderTrack();
        renderProducts();
    }

    function fillSliderTrack() {
        const track = document.getElementById("sliderTrack");
        if (!track) return;

        const max = parseFloat(maxPriceBar.max) || 100;
        const min = parseFloat(minPriceBar.min) || 0;
        const currentMin = parseFloat(minPriceBar.value) || 0;
        const currentMax = parseFloat(maxPriceBar.value) || 100;

        const percent1 = ((currentMin - min) / (max - min)) * 100;
        const percent2 = ((currentMax - min) / (max - min)) * 100;

        track.style.background = `linear-gradient(to right, #ddd ${percent1}%, var(--rocola-green-primary) ${percent1}%, var(--rocola-green-primary) ${percent2}%, #ddd ${percent2}%)`;
    }

    [minPriceNum, maxPriceNum, minPriceBar, maxPriceBar].forEach(el => {
        el.addEventListener('input', syncFilters);
    });

    sortOrder.addEventListener('change', renderProducts);

    function renderProducts() {
        const minP = parseFloat(minPriceNum.value) || 0;
        const maxP = parseFloat(maxPriceNum.value) || Infinity;
        const sortVal = sortOrder.value;

        let filtered = allProducts.filter(p => p.price >= minP && p.price <= maxP);

        // CHANGED: Expanded sort logic to handle price_asc and price_desc
        filtered.sort((a, b) => {
            if (sortVal === 'asc') {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            } else if (sortVal === 'desc') {
                return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
            } else if (sortVal === 'price_asc') {
                return a.price - b.price;
            } else if (sortVal === 'price_desc') {
                return b.price - a.price;
            }
            return 0;
        });

        if (productCounter) {
            productCounter.innerHTML = `<strong>${filtered.length}</strong>`;
        }

        if (filtered.length === 0) {
            productGrid.innerHTML = "<p>Այս գնային միջակայքում ապրանքներ չեն գտնվել (No products found in this price range).</p>";
            return;
        }

        let html = '';

        filtered.forEach(item => {
            const isClickable = item.fname && item.fname.length > 0;
            const folderCode = parseInt(item.code, 10);
            const safeName = item.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const bgColor = isClickable ? '#e1f5fe' : '#ffffff';

            let cardHtml = `
                <div class="product-card"
                     style="background-color: ${bgColor}; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; height: 100%; transition: box-shadow 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer;"
                     onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                     onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">

                    <img src="/images/products/${folderCode}/1.jpg"
                         alt="${safeName}"
                         onerror="this.onerror=null; this.src='/images/products/default.jpg';"
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;" />

                    <div class="product-info">
                        <span class="product-sku" style="font-size: 0.8rem; color: #666;">#${item.code}</span>
                        <h3 class="product-title" style="margin: 0.5rem 0; font-size: 1.1rem;">${item.name}</h3>
                        <div class="product-price" style="font-weight: bold; color: #2c3e50;">
                            ${item.price.toFixed(2)} ֏ <span class="product-unit" style="font-size: 0.9rem; font-weight: normal;">/ ${item.unit}</span>
                        </div>
                    </div>
                </div>
            `;

            const targetUrl = isClickable ? `../products/${item.fname}/` : "#";

            html += `
                <a href="${targetUrl}"
                   onclick="handleProductClick(event, '${item.fname || ''}', '${safeName}')"
                   style="text-decoration: none; color: inherit; display: block;">
                    ${cardHtml}
                </a>
            `;
        });

        html += '';
        productGrid.innerHTML = html;
    }
});
