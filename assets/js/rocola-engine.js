document.addEventListener("DOMContentLoaded", function() {
    const appMount = document.getElementById("rocola-app-mount");
    const productGrid = document.getElementById("productGrid");

    if (!appMount || !productGrid) return;

    appMount.style.display = 'flex';

    // 1. Detect language to load the correct CSV files
    const lang = document.documentElement.lang || 'hy';
    const inventoryCsvPath = `/assets/inventory_${lang}.csv`;
    const categoriesCsvPath = `/assets/categories_${lang}.csv`;

    let allProducts = [];
    let allCategories = [];

    // UI Elements
    const minPriceNum = document.getElementById("minPriceNum");
    const maxPriceNum = document.getElementById("maxPriceNum");
    const minPriceBar = document.getElementById("minPriceBar");
    const maxPriceBar = document.getElementById("maxPriceBar");
    const sortOrder = document.getElementById("sortOrder");
    const productCounter = document.getElementById("productCounter");

    window.handleProductClick = function(event, slug, productName) {
        if (!slug || slug === "undefined" || slug.trim() === "") {
            event.preventDefault();
            alert("⚠️ Demo Notice: The detailed page and photos for '" + productName + "' are currently under preparation.");
        }
    };

    // 2. Fetch both Categories and Products concurrently
    Promise.all([
        fetch(categoriesCsvPath).then(res => res.text()).catch(() => ""),
        fetch(inventoryCsvPath).then(res => res.text()).catch(() => "")
    ]).then(([catCsvText, invCsvText]) => {

        // --- PARSE CATEGORIES ---
        if (catCsvText) {
            const catLines = catCsvText.split('\n').filter(line => line.trim() !== '');
            for (let i = 1; i < catLines.length; i++) {
                const parts = catLines[i].split(',');
                if (parts.length >= 2) {
                    const code = parts[0].trim();
                    const name = parts.slice(1).join(',').trim(); // Join in case name had internal commas

                    // Automatically determine level based on the math format
                    let level = 3;
                    if (code.endsWith('0000')) {
                        level = 1;
                    } else if (code.endsWith('00')) {
                        level = 2;
                    }

                    allCategories.push({ code, level, name });
                }
            }
        }

        // --- INJECT CATEGORY UI ---
        const filterContainer = document.querySelector('.rocola-filters');
        if (filterContainer && allCategories.length > 0) {
            const catGroup = document.createElement('div');
            catGroup.className = 'filter-group category-group';

            // Set dropdown label based on language
            const catLabel = lang === 'hy' ? 'Կատեգորիա' : (lang === 'ru' ? 'Категория' : 'Category');
            const allLabel = lang === 'hy' ? 'Բոլորը' : (lang === 'ru' ? 'Все' : 'All Categories');

            let selectHtml = `<label for="categoryFilter">${catLabel}</label>
            <select id="categoryFilter" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 10px;">
                <option value="all">${allLabel}</option>`;

            allCategories.forEach(c => {
                // Add spacing prefix based on level depth
                const indent = '&nbsp;'.repeat((c.level - 1) * 4);
                selectHtml += `<option value="${c.code}">${indent}${c.name}</option>`;
            });
            selectHtml += `</select>`;
            catGroup.innerHTML = selectHtml;
            filterContainer.prepend(catGroup);

            document.getElementById('categoryFilter').addEventListener('change', renderProducts);
        }

        // --- PARSE INVENTORY ---
        if (invCsvText) {
            const invLines = invCsvText.split('\n').filter(line => line.trim() !== '');
            for (let i = 1; i < invLines.length; i++) {
                const parts = invLines[i].split(',');
                if (parts.length >= 4) {
                    let fname = parts.pop().replace(/(^"|"$)/g, '').trim();
                    let col4 = parts.pop().replace(/(^"|"$)/g, '').trim();
                    let col3 = parts.pop().replace(/(^"|"$)/g, '').trim();
                    let col2 = parts.pop().replace(/(^"|"$)/g, '').trim();

                    let unit, priceStr, categoryStr = "";

                    // Smart detection: check if col2 is Price (Number) and col3 is Unit (String)
                    if (!isNaN(parseFloat(col2)) && isNaN(parseFloat(col3))) {
                        priceStr = col2;
                        unit = col3;
                        categoryStr = col4; // 6-column mode
                    } else {
                        priceStr = col3;
                        unit = col4;
                        parts.push(col2); // 5-column mode, put name fragment back
                    }

                    const code = parts.shift().replace(/(^"|"$)/g, '').trim();
                    const name = parts.join(',').replace(/(^"|"$)/g, '').trim();
                    const priceNum = parseFloat(priceStr);

                    if (!isNaN(priceNum)) {
                        allProducts.push({ code, name, price: priceNum, unit, fname, category: categoryStr });
                    }
                }
            }
        }

        // --- INITIALIZE SLIDERS ---
        if (allProducts.length > 0) {
            const prices = allProducts.map(p => p.price);
            const maxP = Math.ceil(Math.max(...prices));
            const minP = Math.floor(Math.min(...prices));

            if (minPriceNum && minPriceBar) {
                minPriceNum.min = minPriceBar.min = minP;
                minPriceNum.max = minPriceBar.max = maxP;
                maxPriceNum.min = maxPriceBar.min = minP;
                maxPriceNum.max = maxPriceBar.max = maxP;

                minPriceNum.value = minPriceBar.value = minP;
                maxPriceNum.value = maxPriceBar.value = maxP;
            }
        }

        fillSliderTrack();
        renderProducts();
    });

    function syncFilters(e) {
        if (!minPriceNum || !minPriceBar) return;

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
        if (!track || !maxPriceBar || !minPriceBar) return;

        const max = parseFloat(maxPriceBar.max) || 100;
        const min = parseFloat(minPriceBar.min) || 0;
        const currentMin = parseFloat(minPriceBar.value) || 0;
        const currentMax = parseFloat(maxPriceBar.value) || 100;

        const percent1 = ((currentMin - min) / (max - min)) * 100;
        const percent2 = ((currentMax - min) / (max - min)) * 100;

        track.style.background = `linear-gradient(to right, #ddd ${percent1}%, var(--rocola-green-primary) ${percent1}%, var(--rocola-green-primary) ${percent2}%, #ddd ${percent2}%)`;
    }

    [minPriceNum, maxPriceNum, minPriceBar, maxPriceBar].forEach(el => {
        if (el) el.addEventListener('input', syncFilters);
    });

    if (sortOrder) sortOrder.addEventListener('change', renderProducts);

    function renderProducts() {
        const minP = minPriceNum ? (parseFloat(minPriceNum.value) || 0) : 0;
        const maxP = maxPriceNum ? (parseFloat(maxPriceNum.value) || Infinity) : Infinity;
        const sortVal = sortOrder ? sortOrder.value : 'asc';

        const catSelect = document.getElementById('categoryFilter');
        const selectedCat = catSelect ? catSelect.value : 'all';

        // 1. Filter by Price
        let filtered = allProducts.filter(p => p.price >= minP && p.price <= maxP);

        // 2. Filter by Category Code Prefix
        if (selectedCat !== 'all') {
            let prefix = selectedCat;
            if (prefix.endsWith('0000')) {
                prefix = prefix.substring(0, 2); // Top level category
            } else if (prefix.endsWith('00')) {
                prefix = prefix.substring(0, 4); // Sub level category
            }

            filtered = filtered.filter(p => {
                if (!p.category) return false;
                const productCats = p.category.split('-');
                return productCats.some(c => c.startsWith(prefix));
            });
        }

        // 3. Sort Results
        filtered.sort((a, b) => {
            if (sortVal === 'asc') return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            if (sortVal === 'desc') return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
            if (sortVal === 'price_asc') return a.price - b.price;
            if (sortVal === 'price_desc') return b.price - a.price;
            return 0;
        });

        if (productCounter) {
            productCounter.innerHTML = `<strong>${filtered.length}</strong>`;
        }

        if (filtered.length === 0) {
            const noResults = lang === 'hy' ? 'Ապրանքներ չեն գտնվել' : (lang === 'ru' ? 'Товары не найдены' : 'No products found');
            productGrid.innerHTML = `<p>${noResults}.</p>`;
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
                     style="background-color: ${bgColor};"
                     onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                     onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'">

                    <img src="/images/products/${folderCode}/1.avif"
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
