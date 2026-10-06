
document.addEventListener("DOMContentLoaded", function() {
    const cartMount = document.getElementById("cart-page-mount");
    if (!cartMount) return;

    // Safely extract translated labels from the HTML data attributes
    const emptyLabel = cartMount.getAttribute('data-msg-empty') || 'Your cart is empty.';
    const totalLabel = cartMount.getAttribute('data-msg-total') || 'Total Amount:';
    const checkoutLabel = cartMount.getAttribute('data-msg-checkout') || 'Proceed to Checkout';

    let cart = JSON.parse(localStorage.getItem('rocola_cart')) || {};

    function renderCartPage() {
        let html = '';
        let grandTotal = 0;
        const items = Object.keys(cart);

        if (items.length === 0) {
            cartMount.innerHTML = `<p style="text-align: center; font-size: 1.2rem; color: var(--text-muted); padding: 40px 0;">🛒 ${emptyLabel}</p>`;
            return;
        }

        html += '<div style="display: flex; flex-direction: column; gap: 15px;">';

        items.forEach(code => {
            const item = cart[code];
            const itemTotal = item.quantity * item.price;
            grandTotal += itemTotal;

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid var(--border-color); border-radius: 6px; flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 1; min-width: 250px;">
                        <h4 style="margin: 0 0 5px 0; color: var(--text-dark);">${item.name}</h4>
                        <span style="font-size: 0.9rem; color: var(--text-muted);">#${code} | ${item.price.toFixed(2)} ֏ / ${item.unit}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="display: flex; align-items: center; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px;">
                            <button onclick="modifyCartPage('${code}', 'decrease')" style="background: var(--rocola-green-primary); color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 1.1rem;">-</button>
                            <span style="padding: 0 15px; font-weight: bold; font-size: 1.1rem;">${item.quantity}</span>
                            <button onclick="modifyCartPage('${code}', 'increase')" style="background: var(--rocola-green-primary); color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 1.1rem;">+</button>
                        </div>
                        <div style="font-weight: bold; font-size: 1.1rem; color: var(--rocola-green-primary); min-width: 110px; text-align: right;">
                            ${itemTotal.toFixed(2)} ֏
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>
                 <div style="margin-top: 30px; text-align: right; border-top: 2px solid var(--border-color); padding-top: 20px;">
                     <h2 style="margin-bottom: 20px; color: var(--text-dark);">${totalLabel} <span style="color: var(--rocola-green-primary); margin-left: 10px;">${grandTotal.toFixed(2)} ֏</span></h2>
                     <button onclick="alert('User authentication and checkout features coming in the next update!')" style="background: var(--rocola-accent); color: var(--rocola-green-dark); font-size: 1.1rem; font-weight: bold; border: none; padding: 15px 30px; border-radius: 4px; cursor: pointer; transition: transform 0.1s;">
                         ${checkoutLabel}
                     </button>
                 </div>`;

        cartMount.innerHTML = html;
    }

    window.modifyCartPage = function(code, action) {
        if (action === 'increase') {
            cart[code].quantity += 1;
        } else if (action === 'decrease') {
            cart[code].quantity -= 1;
            if (cart[code].quantity <= 0) delete cart[code];
        }
        localStorage.setItem('rocola_cart', JSON.stringify(cart));
        if (window.updateCartBadge) window.updateCartBadge(); // Sync with header badge
        renderCartPage();
    };

    renderCartPage();
});
