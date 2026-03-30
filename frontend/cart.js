// frontend/cart.js - PHIÊN BẢN CHỌN SẢN PHẨM ĐỂ MUA

document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.getElementById('cart-items-container');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTotalEl = document.getElementById('cart-total');
    const btnCheckout = document.getElementById('checkout-btn') || document.getElementById('btn-checkout');

    // --- HÀM HIỂN THỊ GIỎ HÀNG ---
    function renderCart() {
        let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];

        if (cart.length === 0) {
            if (cartContainer) {
                cartContainer.innerHTML = `
                    <div class="text-center py-10">
                        <p class="text-gray-500 text-lg">Giỏ hàng trống trơn.</p>
                        <a href="trangchu.html" class="text-emerald-600 font-bold hover:underline mt-4 inline-block">Đi mua sách ngay</a>
                    </div>
                `;
            }
            updateTotalDisplay(0);
            return;
        }

        if (cartContainer) {
            cartContainer.innerHTML = ''; 
            
            cart.forEach((item, index) => {
                // Xử lý dữ liệu an toàn
                if (!item.quantity || item.quantity < 1) item.quantity = 1;
                if (!item.price) item.price = 0;
                
                let imgSrc = item.image || 'https://placehold.co/100';
                if (imgSrc.startsWith('frontend/')) imgSrc = imgSrc.replace('frontend/', '');

                const itemTotal = item.price * item.quantity;

                // HTML DÒNG SẢN PHẨM (CÓ THÊM CHECKBOX Ở ĐẦU)
                cartContainer.innerHTML += `
                    <div class="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center bg-white">
                        
                        <div class="col-span-1 flex justify-center">
                            <input type="checkbox" class="cart-checkbox w-5 h-5 accent-emerald-600 cursor-pointer" 
                                   data-index="${index}" 
                                   onchange="recalculateTotal()">
                        </div>

                        <div class="col-span-11 md:col-span-5 flex items-center gap-4">
                            <img src="${imgSrc}" class="w-16 h-24 object-cover rounded border">
                            <div>
                                <h3 class="font-bold text-gray-800 line-clamp-2 text-sm md:text-base">
                                    <a href="detail.html?id=${item.id}">${item.title}</a>
                                </h3>
                                <p class="text-xs text-gray-500 md:hidden">${item.price.toLocaleString('vi-VN')}đ</p>
                                <button onclick="removeItem(${index})" class="text-xs text-red-500 mt-1 hover:underline">Xóa</button>
                            </div>
                        </div>

                        <div class="hidden md:block md:col-span-2 text-center text-gray-600 font-medium">
                            ${item.price.toLocaleString('vi-VN')}đ
                        </div>

                        <div class="col-span-6 md:col-span-2 flex justify-center items-center gap-2 pl-4 md:pl-0">
                            <button onclick="decreaseItem(${index})" class="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full font-bold">-</button>
                            <span class="font-bold w-8 text-center">${item.quantity}</span>
                            <button onclick="increaseItem(${index})" class="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full font-bold">+</button>
                        </div>

                        <div class="col-span-6 md:col-span-2 text-right font-bold text-emerald-600">
                            ${itemTotal.toLocaleString('vi-VN')}đ
                        </div>
                    </div>
                `;
            });
            
            // Mặc định ban đầu là 0đ (vì chưa tick cái nào)
            updateTotalDisplay(0);
        }
    }

    // --- XỬ LÝ NÚT THANH TOÁN ---
    if (btnCheckout) {
        btnCheckout.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Lấy danh sách các ô đã tick
            const checkboxes = document.querySelectorAll('.cart-checkbox:checked');
            const cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
            
            // 2. Nếu chưa chọn món nào
            if (checkboxes.length === 0) {
                alert('Bạn chưa chọn sản phẩm nào để thanh toán!');
                return;
            }

            // 3. Kiểm tra đăng nhập
            const user = localStorage.getItem('currentUser');
            if (!user) { 
                alert('Vui lòng ĐĂNG NHẬP để thanh toán!');
                window.location.href = 'login.html'; 
                return;
            }

            // 4. Lọc ra những sản phẩm được chọn
            let itemsToBuy = [];
            checkboxes.forEach(box => {
                const index = box.getAttribute('data-index'); // Lấy vị trí
                itemsToBuy.push(cart[index]); // Nhét sản phẩm đó vào danh sách mua
            });

            // 5. LƯU DANH SÁCH MUA VÀO 'checkout-items' (Khác với 'shopping-cart')
            localStorage.setItem('checkout-items', JSON.stringify(itemsToBuy));

            // 6. Chuyển trang
            window.location.href = 'checkout.html'; 
        });
    }

    renderCart();
});

// --- HÀM TÍNH LẠI TỔNG TIỀN (Khi tick/untick) ---
function recalculateTotal() {
    const cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
    const checkboxes = document.querySelectorAll('.cart-checkbox');
    let total = 0;

    checkboxes.forEach(box => {
        if (box.checked) { // Chỉ tính tiền những ô ĐƯỢC CHỌN
            const index = box.getAttribute('data-index');
            const item = cart[index];
            total += (item.price * item.quantity);
        }
    });

    updateTotalDisplay(total);
}

// Hàm hiển thị số tiền lên màn hình
function updateTotalDisplay(amount) {
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTotalEl = document.getElementById('cart-total');
    const formatted = amount.toLocaleString('vi-VN') + 'đ';
    
    if(cartSubtotalEl) cartSubtotalEl.textContent = formatted;
    if(cartTotalEl) cartTotalEl.textContent = formatted;
}

// --- CÁC HÀM TĂNG/GIẢM/XÓA (Giữ nguyên logic) ---
function decreaseItem(index) {
    let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
    if (cart[index].quantity <= 1) {
        if(confirm('Xóa sản phẩm này?')) cart.splice(index, 1);
    } else {
        cart[index].quantity -= 1;
    }
    localStorage.setItem('shopping-cart', JSON.stringify(cart));
    location.reload();
}

function increaseItem(index) {
    let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
    cart[index].quantity += 1;
    localStorage.setItem('shopping-cart', JSON.stringify(cart));
    location.reload();
}

function removeItem(index) {
    if(confirm('Xóa sản phẩm này?')) {
        let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('shopping-cart', JSON.stringify(cart));
        location.reload();
    }
}