// frontend/load-category.js

// Hàm này nhận vào 2 thứ:
// 1. categoryName: Tên danh mục muốn lấy (Phải khớp với Admin)
// 2. elementId: ID của cái khung div trong HTML để vẽ sách vào
async function loadBooksByCategory(categoryName, elementId) {
    const container = document.getElementById(elementId);
    
    if (!container) return; // Không tìm thấy khung thì thôi

    container.innerHTML = '<p class="text-center col-span-full">Đang tải sách...</p>';

    try {
        // Gọi API kèm theo ?category=...
        const response = await fetch(`http://127.0.0.1:3000/books?category=${encodeURIComponent(categoryName)}`);
        const data = await response.json();

        if (data.success && data.books.length > 0) {
            container.innerHTML = ''; // Xóa chữ đang tải

            data.books.forEach(book => {
                // Logic sửa ảnh
                let imageUrl = book.imageUrl || 'https://placehold.co/300x450';
                if (imageUrl.startsWith('frontend/')) imageUrl = imageUrl.replace('frontend/', '');

                // Vẽ thẻ sách
                const html = `
                    <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition border flex flex-col h-full group">
                        <a href="detail.html?id=${book.id}" class="block h-72 w-full flex items-center justify-center p-4 overflow-hidden">
                            <img src="${imageUrl}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-500">
                        </a>
                        <div class="p-4 flex flex-col flex-grow">
                            <h3 class="font-bold text-gray-800 mb-1 line-clamp-2">
                                <a href="detail.html?id=${book.id}">${book.title}</a>
                            </h3>
                            <p class="text-sm text-gray-500 mb-2">${book.author}</p>
                            <div class="mt-auto">
                                <p class="text-lg font-bold text-red-600">${book.price.toLocaleString('vi-VN')}đ</p>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += html;
            });
        } else {
            container.innerHTML = '<p class="text-center col-span-full text-gray-500">Chưa có sách nào trong danh mục này.</p>';
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Lỗi kết nối Server.</p>';
    }
}