// frontend/detail.js - BẢN ĐẦY ĐỦ (HIỂN THỊ + GIỎ HÀNG)

document.addEventListener('DOMContentLoaded', async () => {
    // --- PHẦN 1: KHỞI TẠO ---
    // Lấy ID từ trên thanh địa chỉ URL (Ví dụ: detail.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    // Các vị trí cần điền thông tin trong HTML
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

    // Các vị trí liên quan đến GIỎ HÀNG
    const btnAddToCart = document.getElementById('btn-add-to-cart');
    const quantityInput = document.getElementById('quantity');
    const cartCountEl = document.getElementById('cart-count');

    // Cập nhật số lượng trên icon giỏ hàng ngay khi vào trang
    updateCartCount();

    // Nếu không có ID trên URL -> Báo lỗi ngay
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
            
            // Đổ dữ liệu vào HTML
            document.title = `${book.title} - BookNè`; 
            
            dom.image.src = book.imageUrl || 'https://placehold.co/400x600?text=No+Image';
            dom.category.textContent = book.category || 'Sách hay';
            dom.title.textContent = book.title;
            dom.author.textContent = book.author;
            dom.stock.textContent = book.stock;
            dom.price.textContent = book.price.toLocaleString('vi-VN') + ' đ';
            dom.desc.textContent = book.description || 'Chưa có mô tả cho cuốn sách này.';

        } else {
            showError(data.message || 'Không tìm thấy sách.');
        }

    } catch (error) {
        console.error(error);
        showError('Lỗi kết nối đến máy chủ.');
    }

    // --- PHẦN 3: LOGIC GIỎ HÀNG (MỚI THÊM) ---

    // Xử lý khi bấm nút "Thêm vào giỏ"
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            // Lấy thông tin sách từ giao diện hiện tại
            const productToAdd = {
                id: bookId,
                title: dom.title.textContent,
                // Chuyển giá tiền từ chữ "100.000 đ" thành số 100000
                price: parseInt(dom.price.textContent.replace(/\D/g, '')), 
                image: dom.image.src,
                quantity: parseInt(quantityInput.value) || 1
            };

            addToCart(productToAdd);
        });
    }

    // Hàm thêm vào bộ nhớ (localStorage)
    function addToCart(product) {
        // 1. Lấy giỏ hàng cũ ra (nếu chưa có thì tạo mảng rỗng)
        let cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];

        // 2. Kiểm tra xem sách này đã có trong giỏ chưa
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            // Nếu có rồi -> Cộng thêm số lượng
            existingItem.quantity += product.quantity;
        } else {
            // Nếu chưa có -> Thêm mới vào
            cart.push(product);
        }

        // 3. Lưu ngược lại vào bộ nhớ
        localStorage.setItem('shopping-cart', JSON.stringify(cart));

        // 4. Thông báo và cập nhật icon
        alert('Đã thêm sách vào giỏ hàng!');
        updateCartCount();
    }

    // Hàm đếm tổng số lượng để hiện lên icon đỏ trên Header
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

    // Hàm hiển thị lỗi
    function showError(msg) {
        if(dom.container) dom.container.classList.add('hidden');
        if(dom.error) {
            dom.error.classList.remove('hidden'); 
            dom.error.textContent = msg;
        }
    }
});