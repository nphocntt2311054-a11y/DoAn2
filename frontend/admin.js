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

    // Nếu không phải Admin -> Đá về trang login
    if (!user || user.isAdmin !== 1) {
        alert("Bạn không có quyền truy cập trang quản trị!");
        window.location.href = 'login.html';
        return;
    }

    // Hiển thị tên Admin lên Header
    const adminNameEl = document.getElementById('admin-username');
    if (adminNameEl) adminNameEl.textContent = user.username;

    // Xử lý Đăng xuất
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
    // 2. QUẢN LÝ TABS (CHUYỂN ĐỔI GIỮA SÁCH - USER - ĐƠN HÀNG)
    // ============================================================
    const tabBooksBtn = document.getElementById('tab-books');
    const tabUsersBtn = document.getElementById('tab-users');
    const tabOrdersBtn = document.getElementById('tab-orders');

    const contentBooks = document.getElementById('content-books');
    const contentUsers = document.getElementById('content-users');
    const contentOrders = document.getElementById('content-orders');

    function switchTab(tabName) {
        // 1. Ẩn hết nội dung & Reset màu nút
        [contentBooks, contentUsers, contentOrders].forEach(el => el && el.classList.add('hidden'));
        [tabBooksBtn, tabUsersBtn, tabOrdersBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active', 'text-emerald-600', 'border-emerald-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            }
        });

        // 2. Hiện tab được chọn
        if (tabName === 'books' && contentBooks && tabBooksBtn) {
            contentBooks.classList.remove('hidden');
            tabBooksBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadBooks(); // Tải lại sách cho chắc
        } 
        else if (tabName === 'users' && contentUsers && tabUsersBtn) {
            contentUsers.classList.remove('hidden');
            tabUsersBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadUsers(); // Tải danh sách User
        } 
        else if (tabName === 'orders' && contentOrders && tabOrdersBtn) {
            contentOrders.classList.remove('hidden');
            tabOrdersBtn.classList.add('active', 'text-emerald-600', 'border-emerald-600');
            loadOrders(); // Tải danh sách Đơn hàng
        }
    }

    // Gắn sự kiện click (Kiểm tra tồn tại để tránh lỗi null)
    if (tabBooksBtn) tabBooksBtn.addEventListener('click', () => switchTab('books'));
    if (tabUsersBtn) tabUsersBtn.addEventListener('click', () => switchTab('users'));
    if (tabOrdersBtn) tabOrdersBtn.addEventListener('click', () => switchTab('orders'));


    // ============================================================
    // 3. CHỨC NĂNG: QUẢN LÝ SÁCH
    // ============================================================
    const bookListDiv = document.getElementById('book-list');
    const addBookForm = document.getElementById('add-book-form');
    const messageEl = document.getElementById('admin-message');

    async function loadBooks() {
        if (!bookListDiv) return;
        try {
            const response = await fetch('http://127.0.0.1:3000/books', { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                bookListDiv.innerHTML = '';
                if (data.books.length === 0) {
                    bookListDiv.innerHTML = '<p class="text-gray-500">Chưa có sách nào.</p>';
                    return;
                }
                data.books.forEach(book => {
                    const item = document.createElement('div');
                    item.className = 'p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm';
                    item.innerHTML = `
                        <div>
                            <h3 class="font-bold text-gray-800">${book.title}</h3>
                            <p class="text-sm text-gray-600">${book.author} - Kho: <span class="font-bold">${book.stock || 0}</span></p>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="font-bold text-emerald-600">${book.price.toLocaleString('vi-VN')}đ</span>
                            <button onclick="deleteBook(${book.id})" class="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-600 hover:text-white transition">Xóa</button>
                        </div>
                    `;
                    bookListDiv.appendChild(item);
                });
            }
        } catch (error) { console.error(error); }
    }

    // Xử lý Thêm Sách
    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const bookData = {
                title: document.getElementById('title').value,
                author: document.getElementById('author').value,
                category: document.getElementById('category').value,
                price: parseFloat(document.getElementById('price').value),
                stock: parseInt(document.getElementById('stock').value) || 1,
                imageUrl: document.getElementById('imageUrl').value,
                description: document.getElementById('description').value,
                position: document.getElementById('book-position').value 
            };

            try {
                const res = await fetch('http://127.0.0.1:3000/books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData),
                    credentials: 'include'
                });
                const result = await res.json();
                if (result.success) {
                    alert("Thêm sách thành công!");
                    addBookForm.reset();
                    loadBooks();
                } else {
                    alert("Lỗi: " + result.message);
                }
            } catch (err) { alert("Lỗi kết nối server."); }
        });
    }

    // ============================================================
    // 4. CHỨC NĂNG: QUẢN LÝ USER
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
                    // Logic hiển thị Admin/User
                    const isAdmin = u.isAdmin === 1;
                    const roleBadge = isAdmin 
                        ? `<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Admin</span>`
                        : `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Khách</span>`;
                    
                    // Logic Nút bấm (Ẩn nút nếu là super admin)
                    let actions = '';
                    if (u.username === 'admin') {
                        actions = `<span class="text-xs text-gray-400 italic">🔒 Super Admin</span>`;
                    } else {
                        const toggleBtn = isAdmin 
                            ? `<button onclick="toggleRole(${u.id}, '${u.username}', 0)" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mr-2">⬇️ Giáng chức</button>`
                            : `<button onclick="toggleRole(${u.id}, '${u.username}', 1)" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">⬆️ Thăng chức</button>`;
                        
                        const delBtn = `<button onclick="deleteUser(${u.id}, '${u.username}')" class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Xóa</button>`;
                        actions = toggleBtn + delBtn;
                    }

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
    // 5. CHỨC NĂNG: QUẢN LÝ ĐƠN HÀNG (Đã fix lỗi [object Object])
    // ============================================================
    async function loadOrders() {
        const orderBody = document.getElementById('order-list-body');
        if (!orderBody) return;
        try {
            const res = await fetch('http://127.0.0.1:3000/admin/orders', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                orderBody.innerHTML = '';
                if (data.orders.length === 0) {
                    orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Chưa có đơn hàng nào.</td></tr>`;
                    return;
                }
                data.orders.forEach(order => {
                    // Xử lý items an toàn
                    let itemsHtml = '<span class="text-red-400 italic text-xs">Lỗi dữ liệu</span>';
                    try {
                        let items = order.items;
                        if (typeof items === 'string' && !items.includes('[object Object]')) {
                            items = JSON.parse(items);
                        }
                        if (Array.isArray(items)) {
                            itemsHtml = items.map(i => 
                                `<div class="truncate w-48 border-b border-gray-100 py-1" title="${i.title}">
                                    • ${i.title} <span class="text-xs font-bold text-gray-500">x${i.quantity||1}</span>
                                </div>`
                            ).join('');
                        }
                    } catch (e) {}

                    // Xử lý giá tiền
                    const price = parseFloat(order.total_price) || 0;
                    
                    // Màu trạng thái
                    const statusColors = {
                        'Đang xử lý': 'bg-yellow-100 text-yellow-800',
                        'Đang giao': 'bg-blue-100 text-blue-800',
                        'Đã giao': 'bg-green-100 text-green-800',
                        'Đã hủy': 'bg-red-100 text-red-800'
                    };
                    const statusClass = statusColors[order.status] || 'bg-gray-100';

                    orderBody.innerHTML += `
                        <tr class="hover:bg-gray-50 text-sm border-b">
                            <td class="py-3 px-4 font-bold align-top">#${order.id}</td>
                            <td class="py-3 px-4 align-top">
                                <div class="font-bold">${order.customer_name || '---'}</div>
                                <div class="text-xs text-gray-500">${order.phone || ''}</div>
                                <div class="text-xs text-gray-400 truncate w-32" title="${order.address}">${order.address || ''}</div>
                            </td>
                            <td class="py-3 px-4 text-xs text-gray-600 align-top">${itemsHtml}</td>
                            <td class="py-3 px-4 text-right font-bold text-emerald-600 align-top">${price.toLocaleString('vi-VN')}đ</td>
                            <td class="py-3 px-4 text-center align-top">
                                <span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass} whitespace-nowrap">${order.status}</span>
                            </td>
                            <td class="py-3 px-4 text-center align-top">
                                <select onchange="updateOrderStatus(${order.id}, this.value)" class="border rounded text-xs p-1 bg-white focus:border-emerald-500 outline-none">
                                    <option value="" disabled selected>Cập nhật...</option>
                                    <option value="Đang xử lý">⏳ Đang xử lý</option>
                                    <option value="Đang giao">🚚 Đang giao</option>
                                    <option value="Đã giao">✅ Đã giao</option>
                                    <option value="Đã hủy">❌ Hủy đơn</option>
                                </select>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (e) { console.error(e); }
    }

    // ============================================================
    // 6. GẮN CÁC HÀM GLOBAL (Để HTML gọi được onclick)
    // ============================================================
    
    window.deleteBook = async (id) => {
        if(!confirm("Xóa sách này?")) return;
        try {
            await fetch(`http://127.0.0.1:3000/admin/delete-book/${id}`, { method: 'DELETE', credentials: 'include' });
            loadBooks();
        } catch(e) { alert("Lỗi xóa sách"); }
    };

    window.deleteUser = async (id, name) => {
        if(!confirm(`Xóa user "${name}"?`)) return;
        try {
            const res = await fetch(`http://127.0.0.1:3000/users/${id}`, { method: 'DELETE', credentials: 'include' });
            const d = await res.json();
            if(d.success) { alert("Đã xóa!"); loadUsers(); }
            else alert(d.message);
        } catch(e) { alert("Lỗi server"); }
    };

    window.toggleRole = async (id, name, role) => {
        const action = role === 1 ? "Thăng chức Admin" : "Giáng chức Khách";
        if(!confirm(`Bạn muốn ${action} cho "${name}"?`)) return;
        try {
            const res = await fetch(`http://127.0.0.1:3000/users/role/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ isAdmin: role }),
                credentials: 'include'
            });
            const d = await res.json();
            if(d.success) { alert("Cập nhật thành công!"); loadUsers(); }
            else alert(d.message);
        } catch(e) { alert("Lỗi server"); }
    };

    window.updateOrderStatus = async (id, status) => {
        if(!confirm(`Đổi trạng thái đơn #${id} thành "${status}"?`)) { loadOrders(); return; }
        try {
            const res = await fetch(`http://127.0.0.1:3000/admin/orders/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status: status }),
                credentials: 'include'
            });
            if(res.ok) { alert("Đã cập nhật!"); loadOrders(); }
        } catch(e) { alert("Lỗi server"); }
    };

    // Mặc định load tab Sách đầu tiên
    switchTab('books');
});