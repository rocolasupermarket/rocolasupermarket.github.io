document.addEventListener("DOMContentLoaded", () => {
    const appMount = document.getElementById('rocola-app-mount');

    // Only initialize if the mount point exists and the user is on the Products page
    if (!appMount) return;
    appMount.style.display = 'flex'; // Reveal the UI shell

    // 1. Locale Detection (Driven by Nikola's base.tmpl <html lang="...">)
    const currentLang = document.documentElement.lang || 'hy';

    // 2. Cache-Busting Hourly Token (YYYY-MM-DD-HH)
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const cacheToken = `${yy}-${mm}-${dd}-${hh}`;

    // Configuration
    const CSV_URL = `/assets/inventory_${currentLang}.csv?v=${cacheToken}`;
    let inventoryData = [];

    // DOM Elements
    const grid = document.getElementById('productGrid');
    const priceSlider = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceValue');
    const sortSelect = document.getElementById('sortOrder');

    // 3. Supabase RPC Blind Call (Global tracking across all pages)
    window.trackProductView = function(sku) {
        // REPLACE WITH YOUR SUPABASE CREDENTIALS
        const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
        const ANON_KEY = 'YOUR_ANON_KEY';

        fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_product_view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({ p_sku: sku })
        }).catch(err => console.warn('Analytics ping failed, safely ignored.'));
    };

    // 4. CSV Fetching & Parsing
    async function fetchInventory() {
        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) throw new Error('Inventory fetch failed');

            const textData = await response.text();
            parseCSV(textData);
            renderUI();
        } catch (error) {
            grid.innerHTML = `<p class="error-msg">Տվյալները հասանելի չեն (Data unavailable). Please try again later.</p>`;
            console.error(error);
        }
    }

    function parseCSV(csvText) {
        // Expected headers: sku, title, price, stock, is_promo, image_url
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',');

        inventoryData = lines.slice(1).map(line => {
            // Simple split assuming no internal commas in descriptions for speed
            const values = line.split(',');
            return {
                sku: values[0],
                title: values[1],
                price: parseFloat(values[2]),
                stock: parseInt(values[3], 10),
                isPromo: values[4].trim().toLowerCase() === 'true',
                imageUrl: values[5]
            };
        });
    }

    // 5. Dynamic Sorting, Filtering, and Rendering
    function renderUI() {
        const maxPrice = parseFloat(priceSlider.value);
        const sortDirection = sortSelect.value;

        // Filter out of stock & apply price range
        let filtered = inventoryData.filter(item => item.stock > 0 && item.price <= maxPrice);

        // Locale-aware sorting + Promotion Prioritization
        filtered.sort((a, b) => {
            // Priority 1: Promos bubble to the top
            if (a.isPromo && !b.isPromo) return -1;
            if (!a.isPromo && b.isPromo) return 1;

            // Priority 2: Locale-aware alphabetical sort
            const titleCompare = a.title.localeCompare(b.title, currentLang);
            return sortDirection === 'asc' ? titleCompare : -titleCompare;
        });

        // DOM Injection
        grid.innerHTML = filtered.map(item => `
            <div class="product-card ${item.isPromo ? 'promo-active' : ''}" onclick="trackProductView('${item.sku}')">
                ${item.isPromo ? '<span class="promo-badge">Ակցիա / Promo</span>' : ''}
                <div class="product-info">
                    <h4>${item.title}</h4>
                    <p class="sku">SKU: ${item.sku}</p>
                    <p class="price">${item.price.toLocaleString('hy-AM')} ֏</p>
                </div>
            </div>
        `).join('');

        if(filtered.length === 0) {
            grid.innerHTML = '<p>Ապրանքներ չեն գտնվել (No products found).</p>';
        }
    }

    // Event Listeners for real-time reactivity
    priceSlider.addEventListener('input', (e) => {
        priceDisplay.textContent = e.target.value;
        renderUI();
    });

    sortSelect.addEventListener('change', renderUI);

    // Boot the engine
    fetchInventory();
});
