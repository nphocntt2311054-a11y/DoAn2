document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // 1. KHỞI TẠO & KIỂM TRA QUYỀN ADMIN
    // ============================================================
    let user = null;
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser && storedUser !== "undefined") {
            user = JSON.parse(storedUser);
        }
    } catch (e) { user = null; }

    if (!user || user.isAdmin !== 1) {
        alert("Bạn không có quyền truy cập trang quản trị!");
        window.location.href = 'login.html';
        return;
    }

    const adminNameEl = document.getElementById('admin-username');
    if (adminNameEl) adminNameEl.textContent = user.username;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!confirm("Bạn muốn đăng xuất?")) return;
            try {
                await fetch('http://127.0.0.1:3000/logout', { method: 'POST', credentials: 'include' });
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            } catch (error) {
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        });
    }

    // ============================================================
    // 2. QUẢN LÝ TABS
    // ============================================================
    const tabBooksBtn = document.getElementById('tab-books');
    const tabUsersBtn = document.getElementById('tab-users');
    const tabOrdersBtn = document.getElementById('tab-orders');
    const contentBooks = document.getElementById('content-books');
    const contentUsers = document.getElementById('content-users');
    const contentOrders = document.getElementById('content-orders');

    function switchTab(tabName) {
        [contentBooks, contentUsers, contentOrders].forEach(el => el && el.classList.add('hidden'));
        [tabBooksBtn, tabUsersBtn, tabOrdersBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active', 'text-emerald-600', 'border-emerald-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            }
        });

        if (tabName === 'books' && contentBooks && tabBooksBtn) {
            contentBooks.classList.remove('hidden');
            tabBooksBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadBooks();
        }
        else if (tabName === 'users' && contentUsers && tabUsersBtn) {
            contentUsers.classList.remove('hidden');
            tabUsersBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadUsers();
        }
        else if (tabName === 'orders' && contentOrders && tabOrdersBtn) {
            contentOrders.classList.remove('hidden');
            tabOrdersBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadOrders();
        }
    }

    if (tabBooksBtn) tabBooksBtn.addEventListener('click', () => switchTab('books'));
    if (tabUsersBtn) tabUsersBtn.addEventListener('click', () => switchTab('users'));
    if (tabOrdersBtn) tabOrdersBtn.addEventListener('click', () => switchTab('orders'));

    // ============================================================
    // 3. QUẢN LÝ SÁCH 
    // ============================================================
    window.allBooksList = [];
    const bookListDiv = document.getElementById('book-list');

    // HÀM XỬ LÝ ẢNH THÔNG MINH (Đặt ngay đây)
    function getValidImageUrl(url) {
        if (!url || url.trim() === '') return 'https://placehold.co/100x150?text=No+Image';
        
        // 1. Nếu là link mạng hoặc ảnh mới upload (đã có sẵn http://127.0.0.1...) -> Giữ nguyên
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // 2. Nếu là file upload cũ đang lưu dạng '/uploads/...' -> Ghép với link Backend
        if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return `http://127.0.0.1:3000${cleanPath}`;
        }

        // 3. CÒN LẠI: Chính là các ảnh cũ nằm ở Frontend (VD: 'image/sach1.png') -> Giữ nguyên để Frontend tự load
        return url;
    }

    async function loadBooks() {
        if (!bookListDiv) return;
        try {
            const response = await fetch('http://127.0.0.1:3000/books', { credentials: 'include' });
            const data = await response.json();
            if (data.success) {

                window.allBooksList = data.books;
                bookListDiv.innerHTML = '';
                
                data.books.forEach(book => {
                    // Gọi hàm xử lý ảnh thông minh ở đây
                    const dbImage = book.image_url || book.imageUrl;
                    const imgUrl = getValidImageUrl(dbImage);

                    const item = document.createElement('div');
                    item.className = 'p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm gap-4';
                    item.innerHTML = `
                        <div class="w-12 h-16 shrink-0 bg-gray-100 rounded overflow-hidden border">
                            <img src="${imgUrl}" class="w-full h-full object-cover" alt="Ảnh sách" onerror="this.src='https://placehold.co/100x150?text=Lỗi+Ảnh'">
                        </div>
                        <div class="flex-1 min-w-0"> 
                            <h3 class="font-bold text-gray-800 truncate" title="${book.title}">${book.title}</h3>
                            <p class="text-sm text-gray-600 truncate" title="${book.author}">${book.author} - Kho: <span class="font-bold">${book.stock || 0}</span></p>
                        </div>
                        <div class="flex items-center gap-3 shrink-0"> 
                            <span class="font-bold text-emerald-600 whitespace-nowrap">${Number(book.price).toLocaleString('vi-VN')}đ</span>
                            <button onclick="editBook(${book.id})" class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-600 hover:text-white transition whitespace-nowrap">Sửa</button>
                            <button onclick="updateStock(${book.id}, ${book.stock || 0})" class="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-600 hover:text-white transition whitespace-nowrap">Nhập thêm</button>
                            <button onclick="deleteBook(${book.id})" class="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-600 hover:text-white transition whitespace-nowrap">Xóa</button>
                        </div>
                    `;
                    bookListDiv.appendChild(item);
                });
            }
        } catch (error) { console.error(error); }
    }

    // ============================================================
    // 3.5. XỬ LÝ FORM THÊM SÁCH
    // ============================================================
    const formAddBook = document.getElementById('add-book-form'); 
    if (formAddBook) { // Đã sửa từ if (addBookForm) thành if (formAddBook) để tránh lỗi đỏ
        formAddBook.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('title', document.getElementById('title').value);
            formData.append('author', document.getElementById('author').value);
            formData.append('category', document.getElementById('category').value);
            formData.append('price', document.getElementById('price').value);
            formData.append('stock', document.getElementById('stock').value || 1);
            formData.append('description', document.getElementById('description').value);
            
            // Xử lý position nếu có trên HTML của bạn
            const positionEl = document.getElementById('book-position');
            if (positionEl) formData.append('position', positionEl.value);

            // Bắt ID theo đúng 2 nút trên giao diện html
            const imageFileInput = document.getElementById('imageFile');
            const imageUrlInput = document.getElementById('imageUrl');

            if (imageFileInput && imageFileInput.files.length > 0) {
                formData.append('imageFile', imageFileInput.files[0]);
            } else if (imageUrlInput && imageUrlInput.value) {
                formData.append('imageUrl', imageUrlInput.value);
            }

            try {
                const res = await fetch('http://127.0.0.1:3000/books', {
                    method: 'POST',
                    body: formData, 
                    credentials: 'include'
                });
                const result = await res.json();
                if (result.success) {
                    alert("Thêm sách thành công!");
                    formAddBook.reset(); // Đã sửa tên biến
                    loadBooks();
                } else {
                    alert("Lỗi: " + result.message);
                }
            } catch (err) { alert("Lỗi kết nối server."); }
        });
    }

    // ============================================================
    // 4. QUẢN LÝ USER
    // ============================================================
    async function loadUsers() {
        const userBody = document.getElementById('user-list-body');
        if (!userBody) return;
        try {
            const res = await fetch('http://127.0.0.1:3000/users', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                userBody.innerHTML = '';
                data.users.forEach(u => {
                    const isAdmin = u.isAdmin === 1;
                    const roleBadge = isAdmin
                        ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Admin</span>`
                        : `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Khách</span>`;

                    let actions = u.username === 'admin'
                        ? `<span class="text-xs text-gray-400 italic">🔒 Super Admin</span>`
                        : (isAdmin
                            ? `<button onclick="toggleRole(${u.id}, '${u.username}', 0)" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mr-2">⬇️ Giáng chức</button>`
                            : `<button onclick="toggleRole(${u.id}, '${u.username}', 1)" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">⬆️ Thăng chức</button>`)
                        + `<button onclick="deleteUser(${u.id}, '${u.username}')" class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Xóa</button>`;

                    userBody.innerHTML += `
                        <tr class="border-b hover:bg-gray-50">
                            <td class="py-3 px-4">#${u.id}</td>
                            <td class="py-3 px-4 font-bold">${u.username}</td>
                            <td class="py-3 px-4 text-center">${roleBadge}</td>
                            <td class="py-3 px-4 text-center">${actions}</td>
                        </tr>
                    `;
                });
            }
        } catch (e) { console.error(e); }
    }

    // ============================================================
    // 5. QUẢN LÝ ĐƠN HÀNG
    // ============================================================
    async function loadOrders() {
        const orderBody = document.getElementById('order-list-body');
        if (!orderBody) return;

        orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500 font-medium">⏳ Đang tải dữ liệu đơn hàng...</td></tr>`;

        try {
            const res = await fetch('http://127.0.0.1:3000/admin/orders', { credentials: 'include' });
            if (!res.ok) throw new Error("Lỗi mạng hoặc sai đường dẫn API");

            const data = await res.json();
            if (data.success) {
                orderBody.innerHTML = '';
                if (data.orders.length === 0) {
                    orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Chưa có đơn hàng nào.</td></tr>`;
                    return;
                }
                data.orders.forEach(order => {
                    let itemsHtml = '';
                    try {
                        let items = order.items;
                        if (typeof items === 'string') {
                            if (items === '[object Object]') items = [];
                            else items = JSON.parse(items);
                        }
                        if (Array.isArray(items) && items.length > 0) {
                            itemsHtml = items.map(i => `<div class="text-xs border-b border-gray-100 py-1">• ${i.title} <span class="font-bold text-gray-500">x${i.quantity || 1}</span></div>`).join('');
                        } else {
                            itemsHtml = '<span class="text-gray-400 text-xs italic">Chưa rõ sản phẩm</span>';
                        }
                    } catch (e) {
                        itemsHtml = '<span class="text-red-400 text-xs italic">Lỗi dữ liệu</span>';
                    }

                    const statusColors = {
                        'Đang xử lý': 'bg-yellow-100 text-yellow-800',
                        'Đang giao': 'bg-blue-100 text-blue-800',
                        'Đã giao': 'bg-green-100 text-green-800',
                        'Đã hủy': 'bg-red-100 text-red-800',
                        'Hủy đơn': 'bg-red-100 text-red-800',
                        'Trả hàng': 'bg-purple-100 text-purple-800'
                    };

                    const isLocked = order.status === 'Đã hủy' || order.status === 'Hủy đơn' || order.status === 'Trả hàng';

                    orderBody.innerHTML += `
                        <tr class="hover:bg-gray-50 text-sm border-b">
                            <td class="py-3 px-4 font-bold align-top">#${order.id}</td>
                            <td class="py-3 px-4 align-top">
                                <div class="font-bold">${order.customer_name || '---'}</div>
                                <div class="text-xs text-gray-500 mt-1">${order.phone || ''}</div>
                                <div class="text-xs text-gray-400 mt-1 truncate w-40" title="${order.address}">${order.address || ''}</div>
                            </td>
                            <td class="py-3 px-4 align-top">${itemsHtml}</td>
                            <td class="py-3 px-4 text-right font-bold text-emerald-600 align-top">${parseFloat(order.total_price || 0).toLocaleString('vi-VN')}đ</td>
                            <td class="py-3 px-4 text-center align-top">
                                <span class="px-2 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || 'bg-gray-100'} whitespace-nowrap">${order.status}</span>
                            </td>
                            <td class="py-3 px-4 text-center align-top">
                                <select 
                                    onchange="updateOrderStatus(${order.id}, this.value, '${order.status}')" 
                                    class="border rounded text-xs p-1 outline-none ${isLocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white focus:border-emerald-500'}"
                                    ${isLocked ? 'disabled' : ''}
                                >
                                    <option value="Đang xử lý" ${order.status === 'Đang xử lý' ? 'selected' : ''}>⏳ Đang xử lý</option>
                                    <option value="Đang giao" ${order.status === 'Đang giao' ? 'selected' : ''}>🚚 Đang giao</option>
                                    <option value="Đã giao" ${order.status === 'Đã giao' ? 'selected' : ''}>✅ Đã giao</option>
                                    <option value="Đã hủy" ${order.status === 'Đã hủy' || order.status === 'Hủy đơn' ? 'selected' : ''}>❌ Hủy đơn</option>
                                    <option value="Trả hàng" ${order.status === 'Trả hàng' ? 'selected' : ''}>↩️ Trả hàng</option>
                                </select>
                            </td>
                        </tr>
                    `;
                });
            } else {
                orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-bold">Lỗi: ${data.message}</td></tr>`;
            }
        } catch (e) {
            console.error("Lỗi Fetch:", e);
            orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-bold bg-red-50">❌ Lỗi kết nối Server! Vui lòng bật file server.js và kiểm tra đúng Port.</td></tr>`;
        }
    }

    // ============================================================
    // 6. CÁC HÀM GLOBAL (Dùng cho các nút bấm)
    // ============================================================
    window.updateOrderStatus = async (id, newStatus, currentStatus) => {
        if (!confirm(`Xác nhận đổi trạng thái đơn #${id} thành "${newStatus}"?`)) {
            loadOrders();
            return;
        }
        try {
            const res = await fetch(`http://127.0.0.1:3000/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert("Đã cập nhật trạng thái thành công!");
                loadOrders();
            } else { alert("Lỗi từ server: " + data.message); }
        } catch (e) { alert("Không thể kết nối đến Server!"); }
    };

    window.deleteBook = async (id) => {
        if (confirm("Xóa sách này?")) {
            await fetch(`http://127.0.0.1:3000/admin/delete-book/${id}`, { method: 'DELETE', credentials: 'include' });
            loadBooks();
        }
    };

    window.updateStock = async (id, currentStock) => {
        const addAmountStr = prompt(`Sách này đang có ${currentStock} cuốn.\nBạn muốn nhập thêm bao nhiêu cuốn về kho?`, "10");
        if (addAmountStr === null || addAmountStr.trim() === "") return;

        const addAmount = parseInt(addAmountStr);
        if (isNaN(addAmount) || addAmount <= 0) {
            return alert("Số lượng nhập vào không hợp lệ! Phải là số lớn hơn 0.");
        }

        const newTotalStock = currentStock + addAmount;
        try {
            const res = await fetch(`http://127.0.0.1:3000/admin/update-book/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newTotalStock }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Đã nhập thêm ${addAmount} cuốn.\nTổng tồn kho mới là: ${newTotalStock}`);
                loadBooks();
            } else { alert("❌ Lỗi: " + data.message); }
        } catch (err) { alert("Lỗi kết nối server."); }
    };

    // ============================================================
    // 7. HÀM SỬA THÔNG TIN SÁCH 
    // ============================================================
    window.editBook = (id) => {
        const book = window.allBooksList.find(b => b.id === id);

        if (!book) return alert("Không tìm thấy sách. Vui lòng tải lại trang!");

        const modalHtml = `
            <div id="edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 class="text-xl font-bold mb-4 text-emerald-600">Sửa Thông Tin Sách</h2>
                    <form id="form-edit-book">
                        <div class="mb-3">
                            <label class="block font-semibold mb-1">Tên sách</label>
                            <input type="text" id="edit-title" class="w-full border p-2 rounded focus:border-emerald-500 outline-none" value="${book.title}" required>
                        </div>
                        <div class="mb-3">
                            <label class="block font-semibold mb-1">Tác giả</label>
                            <input type="text" id="edit-author" class="w-full border p-2 rounded focus:border-emerald-500 outline-none" value="${book.author}" required>
                        </div>
                        <div class="mb-4">
                            <label class="block font-semibold mb-1">Giá (VNĐ)</label>
                            <input type="number" id="edit-price" class="w-full border p-2 rounded focus:border-emerald-500 outline-none" value="${book.price}" required>
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" onclick="document.getElementById('edit-modal').remove()" class="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Hủy</button>
                            <button type="submit" class="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">Lưu thay đổi</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('edit-modal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-edit-book').addEventListener('submit', async (e) => {
            e.preventDefault();

            const updatedData = {
                title: document.getElementById('edit-title').value,
                author: document.getElementById('edit-author').value,
                price: document.getElementById('edit-price').value
            };

            try {
                const updateRes = await fetch(`http://127.0.0.1:3000/admin/edit-book/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData),
                    credentials: 'include'
                });

                const result = await updateRes.json();
                if (result.success) {
                    alert("✅ Sửa thông tin thành công!");
                    document.getElementById('edit-modal').remove();
                    loadBooks();
                } else {
                    alert("❌ Lỗi: " + result.message);
                }
            } catch (err) {
                alert("Lỗi kết nối khi lưu!");
            }
        });
    };

    window.deleteUser = async (id, name) => { if (confirm(`Xóa ${name}?`)) { const res = await fetch(`http://127.0.0.1:3000/users/${id}`, { method: 'DELETE', credentials: 'include' }); loadUsers(); } };
    window.toggleRole = async (id, name, role) => { if (confirm("Đổi quyền?")) { await fetch(`http://127.0.0.1:3000/users/role/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAdmin: role }), credentials: 'include' }); loadUsers(); } };

    switchTab('books');
});