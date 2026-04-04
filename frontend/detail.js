// frontend/detail.js - BẢN ĐẦY ĐỦ (HIỂN THỊ + GIỎ HÀNG + KIỂM TRA TỒN KHO)

document.addEventListener('DOMContentLoaded', async () => {
    // --- PHẦN 1: KHỞI TẠO ---
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    const dom = {
        container: document.getElementById('product-detail'),
        error: document.getElementById('error-message'),
        image: document.getElementById('book-image'),
        category: document.getElementById('book-category'),
        title: document.getElementById('book-title'),
        author: document.getElementById('book-author'),
        stock: document.getElementById('book-stock'),
        price: document.getElementById('book-price'),
        desc: document.getElementById('book-desc')
    };

    const btnAddToCart = document.getElementById('btn-add-to-cart');
    const quantityInput = document.getElementById('quantity');
    const cartCountEl = document.getElementById('cart-count');

    updateCartCount();

    if (!bookId) {
        showError('Không tìm thấy mã sản phẩm!');
        return;
    }

    // --- PHẦN 2: LẤY DỮ LIỆU TỪ SERVER ---
    try {
        const response = await fetch(`http://127.0.0.1:3000/books/${bookId}`, {
            credentials: 'include'
        });
        
        const data = await response.json();

        if (data.success) {
            const book = data.book;
            
            document.title = `${book.title} - BookNè`; 
            dom.image.src = book.image_url || 'https://placehold.co/400x600?text=No+Image';
            dom.category.textContent = book.category || 'Sách hay';
            dom.title.textContent = book.title;
            dom.author.textContent = book.author;
            dom.price.textContent = Number(book.price).toLocaleString('vi-VN') + ' đ';
            dom.desc.textContent = book.description || 'Chưa có mô tả cho cuốn sách này.';

            // ==========================================
            // LOGIC KIỂM TRA TỒN KHO (BƯỚC 4 CỦA BẠN ĐÂY)
            // ==========================================
            if (book.stock <= 0) {
                // Nếu hết hàng: Hiện chữ Hết hàng màu đỏ
                dom.stock.textContent = "Hết hàng";
                dom.stock.className = "text-red-500 font-bold";
                
                // Khóa nút Thêm vào giỏ hàng
                if (btnAddToCart) {
                    btnAddToCart.disabled = true;
                    btnAddToCart.textContent = "Đã hết hàng";
                    // Đổi màu nút thành xám để người dùng biết là không bấm được
                    btnAddToCart.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                    btnAddToCart.classList.add('bg-gray-400', 'cursor-not-allowed');
                }
            } else {
                // Nếu còn hàng: Hiện số lượng bình thường
                dom.stock.textContent = book.stock;
                dom.stock.className = "font-medium text-gray-900"; // Trả lại màu chữ bình thường
            }

        } else {
            showError(data.message || 'Không tìm thấy sách.');
        }

    } catch (error) {
        console.error(error);
        showError('Lỗi kết nối đến máy chủ.');
    }

    // --- PHẦN 3: LOGIC GIỎ HÀNG ---
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            const productToAdd = {
                id: bookId,
                title: dom.title.textContent,
                price: parseInt(dom.price.textContent.replace(/\D/g, '')), 
                image: dom.image.src,
                quantity: parseInt(quantityInput.value) || 1
            };

            addToCart(productToAdd);
        });
    }

    function addToCart(product) {
        let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += product.quantity;
        } else {
            cart.push(product);
        }

        localStorage.setItem('shopping-cart', JSON.stringify(cart));
        alert('Đã thêm sách vào giỏ hàng!');
        updateCartCount();
    }

    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
        const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCountEl) {
            cartCountEl.textContent = totalQuantity;
            if (totalQuantity > 0) {
                cartCountEl.classList.remove('hidden');
            } else {
                cartCountEl.classList.add('hidden');
            }
        }
    }

    function showError(msg) {
        if(dom.container) dom.container.classList.add('hidden');
        if(dom.error) {
            dom.error.classList.remove('hidden'); 
            dom.error.textContent = msg;
        }
    }
});