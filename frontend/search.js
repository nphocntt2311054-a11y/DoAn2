// frontend/search.js

document.addEventListener('DOMContentLoaded', async () => {
    const resultsContainer = document.getElementById('search-results');
    const keywordSpan = document.getElementById('search-keyword');

    // 1. Lấy từ khóa từ thanh địa chỉ (URL)
    // Ví dụ: search.html?q=harry -> Lấy được chữ "harry"
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (!query) {
        resultsContainer.innerHTML = '<p class="col-span-full text-center">Vui lòng nhập từ khóa tìm kiếm.</p>';
        return;
    }

    // Hiển thị từ khóa lên tiêu đề
    keywordSpan.textContent = `"${query}"`;

    // 2. Gọi API tìm kiếm
    try {
        const response = await fetch(`http://127.0.0.1:3000/books?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.books.length > 0) {
            resultsContainer.innerHTML = ''; // Xóa chữ đang tải
            
            // Vẽ sách ra (Copy logic vẽ thẻ sách từ trangchu.js sang đây)
            data.books.forEach(book => {
                // Xử lý ảnh
                let imageUrl = book.imageUrl || 'https://placehold.co/300x450';
                if (imageUrl.startsWith('frontend/')) imageUrl = imageUrl.replace('frontend/', '');

                const html = `
                    <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition border flex flex-col">
                        <a href="detail.html?id=${book.id}" class="h-64 flex items-center justify-center p-4">
                            <img src="${imageUrl}" class="max-h-full max-w-full object-contain">
                        </a>
                        <div class="p-4 flex-grow flex flex-col">
                            <h3 class="font-bold text-gray-800 mb-1 line-clamp-2">
                                <a href="detail.html?id=${book.id}">${book.title}</a>
                            </h3>
                            <p class="text-sm text-gray-500 mb-2">${book.author}</p>
                            <p class="text-red-600 font-bold mt-auto">${book.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                    </div>
                `;
                resultsContainer.innerHTML += html;
            });
        } else {
            resultsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Không tìm thấy cuốn sách nào phù hợp.</p>';
        }

    } catch (error) {
        console.error(error);
        resultsContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Lỗi kết nối Server.</p>';
    }
});