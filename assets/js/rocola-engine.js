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

    let currentPage = 1;

    // --- CART LOGIC ---
    let cart = JSON.parse(localStorage.getItem('rocola_cart')) || {};

    /*window.updateCartBadge = function() {
        const badge = document.getElementById('cart-count-badge');
        if (badge) {
            const totalUniqueItems = Object.keys(cart).length;
            badge.innerText = totalUniqueItems;
            badge.style.display = totalUniqueItems > 0 ? 'inline-block' : 'none';
        }
    };

    updateCartBadge(); // Run on page load
    */

    window.modifyCart = function(event, code, action, price, name, unit) {
        event.preventDefault();
        event.stopPropagation(); // Prevents navigating to the product page when clicking buttons

        if (!cart[code]) {
            if (action === 'add' || action === 'increase') {
                cart[code] = { quantity: 1, price: price, name: name, unit: unit };
            }
        } else {
            if (action === 'increase') {
                cart[code].quantity += 1;
            } else if (action === 'decrease') {
                cart[code].quantity -= 1;
                if (cart[code].quantity <= 0) delete cart[code];
            }
        }

        localStorage.setItem('rocola_cart', JSON.stringify(cart));
        updateCartBadge();

        // Re-render the grid instantly to update the button states
        if (document.getElementById("productGrid")) renderProducts();
    };

    // UI Elements
    const minPriceNum = document.getElementById("minPriceNum");
    const maxPriceNum = document.getElementById("maxPriceNum");
    const minPriceBar = document.getElementById("minPriceBar");
    const maxPriceBar = document.getElementById("maxPriceBar");

    const itemsPerPageInput = document.getElementById("itemsPerPage");
    const paginationContainer = document.getElementById("paginationContainer");

    //const sortOrder = document.getElementById("sortOrder");
    const sortNameOrder = document.getElementById("sortNameOrder");
    const sortPriceOrder = document.getElementById("sortPriceOrder");

    const productCounter = document.getElementById("productCounter");
    const productSearch = document.getElementById("productSearch");

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
                    const name = parts.slice(1).join(',').trim();

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

            const catLabel = lang === 'hy' ? 'Կատեգորիա' : (lang === 'ru' ? 'Категория' : 'Category');
            const allLabel = lang === 'hy' ? 'Բոլորը' : (lang === 'ru' ? 'Все' : 'All Categories');

            let selectHtml = `<label for="categoryFilter">${catLabel}</label>
            <select id="categoryFilter" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 10px;">
                <option value="all">${allLabel}</option>`;

            allCategories.forEach(c => {
                const indent = '&nbsp;'.repeat((c.level - 1) * 4);
                selectHtml += `<option value="${c.code}">${indent}${c.name}</option>`;
            });
            selectHtml += `</select>`;
            catGroup.innerHTML = selectHtml;

            // Insert Category Dropdown directly after the Search Bar
            const searchGroup = document.querySelector('.search-group');
            if (searchGroup) {
                searchGroup.parentNode.insertBefore(catGroup, searchGroup.nextSibling);
            } else {
                filterContainer.prepend(catGroup);
            }

            document.getElementById('categoryFilter').addEventListener('change', () => { currentPage = 1; renderProducts(); });

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

                    if (!isNaN(parseFloat(col2)) && isNaN(parseFloat(col3))) {
                        priceStr = col2;
                        unit = col3;
                        categoryStr = col4;
                    } else {
                        priceStr = col3;
                        unit = col4;
                        parts.push(col2);
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

    const resetPageAndRender = () => { currentPage = 1; renderProducts(); };

    [minPriceNum, maxPriceNum, minPriceBar, maxPriceBar].forEach(el => {
        if (el) el.addEventListener('input', (e) => { syncFilters(e); currentPage = 1; });
    });

    if (sortNameOrder) sortNameOrder.addEventListener('change', () => {
      if (sortNameOrder.value !== 'none') sortPriceOrder.value = 'none';
      resetPageAndRender();
    });
    if (sortPriceOrder) sortPriceOrder.addEventListener('change', () => {
      if (sortPriceOrder.value !== 'none') sortNameOrder.value = 'none';
      resetPageAndRender();
    });

    // Listen for live search input
    if (productSearch) productSearch.addEventListener('input', resetPageAndRender);
    if (itemsPerPageInput) itemsPerPageInput.addEventListener('change', resetPageAndRender);

    // Add pagination click handler to the window object
    window.goToPage = function(page) {
        currentPage = page;
        renderProducts();
        document.getElementById("rocola-app-mount").scrollIntoView({ behavior: 'smooth' });
    };

    function renderProducts() {
        const minP = minPriceNum ? (parseFloat(minPriceNum.value) || 0) : 0;
        const maxP = maxPriceNum ? (parseFloat(maxPriceNum.value) || Infinity) : Infinity;
        //const sortVal = sortOrder ? sortOrder.value : 'asc';
        const sortNameVal = sortNameOrder ? sortNameOrder.value : 'none';
        const sortPriceVal = sortPriceOrder ? sortPriceOrder.value : 'none';


        const catSelect = document.getElementById('categoryFilter');
        const selectedCat = catSelect ? catSelect.value : 'all';

        const searchQuery = productSearch ? productSearch.value.toLowerCase().trim() : '';

        // 1. Filter by Price
        let filtered = allProducts.filter(p => p.price >= minP && p.price <= maxP);

        // 2. Filter by Search Query
        if (searchQuery) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery));
        }

        // 3. Filter by Category Code Prefix
        if (selectedCat !== 'all') {
            let prefix = selectedCat;
            if (prefix.endsWith('0000')) {
                prefix = prefix.substring(0, 2);
            } else if (prefix.endsWith('00')) {
                prefix = prefix.substring(0, 4);
            }

            filtered = filtered.filter(p => {
                if (!p.category) return false;
                const productCats = p.category.split('-');
                return productCats.some(c => c.startsWith(prefix));
            });
        }

        // 4. Sort Results
        /*filtered.sort((a, b) => {
            if (sortVal === 'asc') return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            if (sortVal === 'desc') return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
            if (sortVal === 'price_asc') return a.price - b.price;
            if (sortVal === 'price_desc') return b.price - a.price;
            return 0;
        });*/

        // 4. Sort Results (Preserve CSV order if 'none' is selected)
        if (sortNameVal !== 'none' || sortPriceVal !== 'none') {
            filtered.sort((a, b) => {
                if (sortNameVal === 'asc') return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                if (sortNameVal === 'desc') return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
                if (sortPriceVal === 'price_asc') return a.price - b.price;
                if (sortPriceVal === 'price_desc') return b.price - a.price;
                return 0;
            });
        }

        if (productCounter) {
            productCounter.innerHTML = `<strong>${filtered.length}</strong>`;
        }

        if (filtered.length === 0) {
            const noResults = lang === 'hy' ? 'Ապրանքներ չեն գտնվել' : (lang === 'ru' ? 'Товары не найдены' : 'No products found');
            productGrid.innerHTML = `<p>${noResults}.</p>`;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        // --- PAGINATION LOGIC ---
        const itemsPerPage = itemsPerPageInput ? (parseInt(itemsPerPageInput.value) || 40) : 40;
        const totalPages = Math.ceil(filtered.length / itemsPerPage);

        // Ensure current page is within valid range
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = filtered.slice(startIndex, endIndex);

        let html = '';

        paginatedItems.forEach(item => {
            const isClickable = item.fname && item.fname.length > 0;
            const folderCode = parseInt(item.code, 10);
            const safeName = item.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const bgColor = isClickable ? 'var(--bg-clickable)' : 'var(--bg-card)';
            const targetUrl = isClickable ? `../products/${item.fname}/` : "#";

            // Determine Cart Button State
            const inCart = cart[item.code] ? cart[item.code].quantity : 0;
            const addLabel = lang === 'hy' ? 'Ավելացնել զամբյուղ' : (lang === 'ru' ? 'В корзину' : 'Add to Cart');

            let cartControls = '';
            if (inCart > 0) {
                cartControls = `
                    <div class="cart-controls" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; background: var(--bg-main); border-radius: 4px; padding: 4px; border: 1px solid var(--border-color);">
                        <button onclick="modifyCart(event, '${item.code}', 'decrease')" style="background: var(--rocola-green-primary); color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; line-height: 1;">-</button>
                        <span style="font-weight: bold; font-size: 1.1rem; color: var(--rocola-green-dark);">${inCart}</span>
                        <button onclick="modifyCart(event, '${item.code}', 'increase')" style="background: var(--rocola-green-primary); color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; line-height: 1;">+</button>
                    </div>
                `;
            } else {
                cartControls = `
                    <button onclick="modifyCart(event, '${item.code}', 'add', ${item.price}, '${safeName}', '${item.unit}')" style="width: 100%; margin-top: 10px; background: var(--rocola-accent); color: var(--rocola-green-dark); font-weight: bold; border: none; padding: 8px; border-radius: 4px; cursor: pointer; transition: opacity 0.2s;">
                        🛒 ${addLabel}
                    </button>
                `;
            }

            let cardHtml = `
                <div class="product-card"
                     style="background-color: ${bgColor};"
                     onmouseover="this.style.boxShadow='0 4px 8px var(--shadow-hover)'"
                     onmouseout="this.style.boxShadow='0 1px 3px var(--shadow-color)'">

                    <!-- Product Clickable Area -->
                    <a href="${targetUrl}"
                       onclick="handleProductClick(event, '${item.fname || ''}', '${safeName}')"
                       style="text-decoration: none; color: inherit; display: block; flex-grow: 1;">

                        <img src="/images/products/${folderCode}/1.avif"
                             alt="${safeName}"
                             onerror="this.onerror=null; this.src='/images/products/default.jpg';"
                             style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;" />

                        <div class="product-info">
                            <span class="product-sku" style="font-size: 0.8rem; color: var(--text-muted);">#${item.code}</span>
                            <h3 class="product-title" style="margin: 0.5rem 0; font-size: 1.1rem; color: var(--text-dark);">${item.name}</h3>
                            <div class="product-price" style="font-weight: bold; color: var(--rocola-green-primary);">
                                ${item.price.toFixed(2)} ֏ <span class="product-unit" style="font-size: 0.9rem; font-weight: normal; color: var(--text-dark);">/ ${item.unit}</span>
                            </div>
                        </div>
                    </a>

                    <!-- Dedicated Cart Area -->
                    <div>
                        ${cartControls}
                    </div>
                </div>
            `;

            html += cardHtml;
        });

        productGrid.innerHTML = html;

        // --- RENDER PAGINATION BUTTONS ---
        if (paginationContainer) {
            let pageHtml = '';

            const lblFirst = lang === 'hy' ? 'Առաջին' : (lang === 'ru' ? 'Первая' : 'First');
            const lblPrev = lang === 'hy' ? 'Նախորդ' : (lang === 'ru' ? 'Пред.' : 'Prev');
            const lblNext = lang === 'hy' ? 'Հաջորդ' : (lang === 'ru' ? 'След.' : 'Next');
            const lblLast = lang === 'hy' ? 'Վերջին' : (lang === 'ru' ? 'Последняя' : 'Last');

            if (totalPages > 1) {
                // First & Prev
                pageHtml += `<button class="pagination-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>&laquo; ${lblFirst}</button>`;
                pageHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&lsaquo; ${lblPrev}</button>`;

                // Dynamic Page Numbers with "..."
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);

                if (startPage > 1) {
                    pageHtml += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
                    if (startPage > 2) pageHtml += `<span class="pagination-ellipsis">...</span>`;
                }

                for (let i = startPage; i <= endPage; i++) {
                    pageHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
                }

                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pageHtml += `<span class="pagination-ellipsis">...</span>`;
                    pageHtml += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
                }

                // Next & Last
                pageHtml += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>${lblNext} &rsaquo;</button>`;
                pageHtml += `<button class="pagination-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>${lblLast} &raquo;</button>`;
            }

            paginationContainer.innerHTML = pageHtml;
        }
    }
});
