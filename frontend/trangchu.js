// --- XỬ LÝ BANNER SLIDER ---
    const bannerSlider = document.getElementById('banner-slider');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Kiểm tra xem có banner không để tránh lỗi
    if (bannerSlider && prevBtn && nextBtn) {
        const slides = bannerSlider.children;
        const totalSlides = slides.length;
        let currentIndex = 0;
        
        // Hàm trượt banner
        function updateSlide() {
            // Dùng CSS transform để dịch chuyển
            // -0% là slide 1, -100% là slide 2, -200% là slide 3...
            bannerSlider.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
        
        // Sự kiện nút Next
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % totalSlides; // Vòng lại đầu nếu hết
            updateSlide();
        });
        
        // Sự kiện nút Prev
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; // Vòng lại cuối nếu đang ở đầu
            updateSlide();
        });

    }


document.addEventListener('DOMContentLoaded', () => {
    // 1. KHỞI TẠO CÁC KỆ SÁCH
    const featuredList = document.getElementById('featured-book-list'); // Kệ Nổi Bật
    const newList = document.getElementById('new-book-list');           // Kệ Mới
    const suggestedList = document.getElementById('suggested-book-list'); // Kệ Gợi Ý

    // Cập nhật số lượng giỏ hàng (nếu có common.js)
    if (typeof updateCartCount === 'function') updateCartCount();

    // ---------------------------------------------------------
    // 2. HÀM TẠO THẺ SÁCH (HTML)
    // ---------------------------------------------------------
    function createBookCard(book) {
        // Tự động sửa đường dẫn ảnh nếu bị thừa chữ 'frontend/'
        let imageUrl = book.imageUrl || 'https://placehold.co/300x450/e2e8f0/64748b?text=BookNè';
        if (imageUrl.startsWith('frontend/')) {
            imageUrl = imageUrl.replace('frontend/', ''); 
        }

        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden group transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 flex flex-col h-full">
                <a href="detail.html?id=${book.id}" class="block h-72 w-full flex items-center justify-center p-4 overflow-hidden relative bg-white">
                    <img class="w-auto h-auto max-h-full max-w-full object-contain shadow-sm group-hover:scale-105 transition-transform duration-500" 
                         src="${imageUrl}" 
                         alt="Bìa sách ${book.title}">
                </a>
                <div class="px-4 pb-4 flex flex-col flex-grow">
                    <h3 class="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 min-h-[2.5rem] group-hover:text-emerald-600" title="${book.title}">
                        <a href="detail.html?id=${book.id}">${book.title}</a>
                    </h3>
                    <p class="text-xs text-gray-500 mb-2">${book.author}</p>
                    <div class="mt-auto flex items-center justify-between">
                         <p class="text-lg font-bold text-red-600">${book.price.toLocaleString('vi-VN')}đ</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ---------------------------------------------------------
    // 3. HÀM TẢI SÁCH TỪ SERVER
    // ---------------------------------------------------------
    async function loadAllBooks() {
        // Hiện thông báo đang tải
        if (featuredList) featuredList.innerHTML = '<p class="col-span-full text-center">Đang tải...</p>';
        if (newList) newList.innerHTML = '<p class="col-span-full text-cen ter">Đang tải...</p>';
        if (suggestedList) suggestedList.innerHTML = '<p class="col-span-full text-center">Đang tải...</p>';

        try {
            // Gọi API lấy sách
            const response = await fetch('http://127.0.0.1:3000/books');
            const data = await response.json();

            if (data.success && data.books.length > 0) {
                // Xóa thông báo loading
                if (featuredList) featuredList.innerHTML = '';
                if (newList) newList.innerHTML = '';
                if (suggestedList) suggestedList.innerHTML = '';

                const allBooks = data.books;

                // --- A. LỌC SÁCH THEO VỊ TRÍ ---
                const featuredBooks = allBooks.filter(book => book.position === 'featured');
                const newBooks = allBooks.filter(book => book.position === 'new' || !book.position);
                const suggestedBooks = allBooks.filter(book => book.position === 'suggested');

                // --- B. VẼ SÁCH RA HTML (Giới hạn số lượng) ---
                
                // 1. Kệ Nổi Bật (Lấy 4 cuốn)
                featuredBooks.slice(0, 4).forEach(book => {
                    if (featuredList) featuredList.innerHTML += createBookCard(book);
                });

                // 2. Kệ Mới (Lấy 4 cuốn)
                newBooks.slice(0, 4).forEach(book => {
                    if (newList) newList.innerHTML += createBookCard(book);
                });

                // 3. Kệ Gợi Ý (Lấy 5 cuốn)
                suggestedBooks.slice(0, 5).forEach(book => {
                    if (suggestedList) suggestedList.innerHTML += createBookCard(book);
                });

                // Báo trống nếu không có sách
                if (featuredList && featuredList.innerHTML === '') featuredList.innerHTML = '<p class="col-span-full text-center text-gray-400 text-sm">Chưa có sách nổi bật.</p>';
                if (newList && newList.innerHTML === '') newList.innerHTML = '<p class="col-span-full text-center text-gray-400 text-sm">Chưa có sách mới.</p>';
                if (suggestedList && suggestedList.innerHTML === '') suggestedList.innerHTML = '<p class="col-span-full text-center text-gray-400 text-sm">Chưa có sách gợi ý.</p>';
            }
        } catch (error) {
            console.error('Lỗi tải sách:', error);
            // Báo lỗi kết nối
            const errorMsg = '<p class="col-span-full text-center text-red-500">Lỗi kết nối server (Kiểm tra node server.js).</p>';
            if (featuredList) featuredList.innerHTML = errorMsg;
            if (newList) newList.innerHTML = errorMsg;
        }
    }

    // --- CHẠY HÀM TẢI SÁCH NGAY ---
    loadAllBooks();
});