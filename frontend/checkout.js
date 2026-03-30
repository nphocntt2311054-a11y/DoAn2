
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. KIỂM TRA ĐĂNG NHẬP & DỮ LIỆU ---
    let user = null;
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser && storedUser !== "undefined") {
            user = JSON.parse(storedUser);
        }
    } catch (e) { user = null; }

    if (!user) {
        alert('Bạn chưa đăng nhập. Vui lòng đăng nhập để thanh toán.');
        window.location.href = 'login.html'; 
        return; 
    }

    // Lấy danh sách hàng CẦN THANH TOÁN
    const itemsToBuy = JSON.parse(localStorage.getItem('checkout-items')) || [];
    
    const orderItemsContainer = document.getElementById('order-summary'); 
    const orderTotalEl = document.getElementById('order-total');
    const btnConfirm = document.getElementById('confirm-order-btn');

    // Tự động điền tên user
    const nameInput = document.getElementById('customer_name');
    if (nameInput && !nameInput.value) {
        nameInput.value = user.username || '';
    }

    // Nếu không có món nào
    if (itemsToBuy.length === 0) {
        alert('Không có sản phẩm nào để thanh toán. Quay lại giỏ hàng nhé!');
        window.location.href = 'cart.html';
        return;
    }

    // --- 2. HIỂN THỊ DANH SÁCH & TÍNH TIỀN ---
    let totalAmount = 0;

    if (orderItemsContainer) {
        orderItemsContainer.innerHTML = '';
        
        itemsToBuy.forEach(item => {
            // Xử lý giá tiền
            let price = item.price;
            if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^\d]/g, '')); 
            }
            if (isNaN(price)) price = 0;
            
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            totalAmount += itemTotal;
            
            // Xử lý ảnh
            let imgSrc = item.image || 'https://placehold.co/100?text=No+Img';
            if (imgSrc.startsWith('frontend/')) imgSrc = imgSrc.replace('frontend/', '');

            // Hiển thị HTML
            orderItemsContainer.innerHTML += `
                <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div class="flex items-center gap-3">
                         <div class="bg-gray-100 w-12 h-16 flex items-center justify-center rounded overflow-hidden flex-shrink-0">
                            <img src="${imgSrc}" class="w-full h-full object-cover">
                         </div>
                         <div>
                            <p class="font-medium text-sm text-gray-800 line-clamp-1 w-40 md:w-48">${item.title}</p>
                            <p class="text-xs text-gray-500">SL: ${quantity} x ${price.toLocaleString('vi-VN')}đ</p>
                         </div>
                    </div>
                    <span class="font-bold text-sm text-gray-700">${itemTotal.toLocaleString('vi-VN')}đ</span>
                </div>
            `;
        });

        // Cập nhật tổng tiền
        if (orderTotalEl) {
            orderTotalEl.textContent = totalAmount.toLocaleString('vi-VN') + 'đ';
        }
    }

    // --- 3. XỬ LÝ KHI BẤM NÚT "XÁC NHẬN" ---
    if (btnConfirm) {
        btnConfirm.addEventListener('click', async (e) => {
            e.preventDefault();

            const name = document.getElementById('customer_name').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;

            if (!name || !phone || !address) {
                alert('Vui lòng điền đầy đủ thông tin giao hàng!');
                return;
            }

            const orderData = {
                user_id: user.id,           
                customer_name: name,
                phone: phone,
                address: address,
                total_price: totalAmount,
                items: itemsToBuy           
            };

            try {
                const response = await fetch('http://127.0.0.1:3000/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (result.success) {
                    alert(' ĐẶT HÀNG THÀNH CÔNG! Mã đơn: #' + (result.orderId || 'Mới'));
                    
                    // 1. Lấy giỏ hàng cũ ra (shopping-cart)
                    let currentCart = JSON.parse(localStorage.getItem('shopping-cart')) || [];

                    // 2. Lọc lại: Giữ lại những món KHÔNG có ID nằm trong danh sách vừa mua (itemsToBuy)
                    // (Dùng hàm filter để loại bỏ những món đã mua)
                    const remainingCart = currentCart.filter(cartItem => {
                        // Kiểm tra xem item trong giỏ có nằm trong danh sách mua không?
                        const isBought = itemsToBuy.some(boughtItem => boughtItem.id === cartItem.id);
                        return !isBought; // Nếu chưa mua thì giữ lại (return true)
                    });

                    // 3. Lưu giỏ hàng mới (đã loại bỏ hàng đã mua) vào lại bộ nhớ
                    localStorage.setItem('shopping-cart', JSON.stringify(remainingCart));

                    // 4. Xóa danh sách chờ thanh toán (vì đã thanh toán xong rồi)
                    localStorage.removeItem('checkout-items');
                    window.location.href = 'history.html';
                } else {
                    alert('Lỗi: ' + result.message);
                }

            } catch (error) {
                console.error(error);
                alert('Lỗi kết nối server. Vui lòng thử lại!');
            }
        });
    }
});