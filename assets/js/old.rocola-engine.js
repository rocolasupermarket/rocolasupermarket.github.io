document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("rocola-inventory");
    if (!container) return;

    // Determine current language from the html lang attribute (default to 'hy')
    const lang = document.documentElement.lang || 'hy';
    const csvPath = `/assets/inventory_${lang}.csv`;

    fetch(csvPath)
        .then(response => response.text())
        .then(csvText => {
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return;

            const headers = lines[0].split(',').map(h => h.trim());
            const products = [];

            // Parse CSV lines
            for (let i = 1; i < lines.length; i++) {
                // Handle basic CSV splitting (ignoring commas inside quotes if needed,
                // though the current schema uses straightforward columns)
                const data = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (data && data.length >= 4) {
                    products.push({
                        code: data[0].replace(/(^"|"$)/g, ''),
                        name: data[1].replace(/(^"|"$)/g, ''),
                        price: parseFloat(data[2].replace(/(^"|"$)/g, '')).toFixed(2),
                        unit: data[3].replace(/(^"|"$)/g, '')
                    });
                }
            }
            renderProducts(products);
        })
        .catch(error => console.error("Error loading inventory:", error));

    function renderProducts(products) {
        let html = '<div class="product-grid">';
        products.forEach(item => {
            html += `
                <div class="product-card">
                    <div class="product-info">
                        <span class="product-sku">#${item.code}</span>
                        <h3 class="product-title">${item.name}</h3>
                        <div class="product-price">${item.price} ֏ <span class="product-unit">/ ${item.unit}</span></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
});
