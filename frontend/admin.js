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
    const bookListDiv = document.getElementById('book-list');
    async function loadBooks() {
        if (!bookListDiv) return;
        try {
            const response = await fetch('http://127.0.0.1:3000/books', { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                bookListDiv.innerHTML = '';
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
    // 5. QUẢN LÝ ĐƠN HÀNG (ĐÃ FIX LỖI HIỂN THỊ TRẮNG MÀN HÌNH)
    // ============================================================
    async function loadOrders() {
        const orderBody = document.getElementById('order-list-body');
        if (!orderBody) return;

        // 1. Hiện dòng chữ Đang tải trước khi chờ Server
        orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500 font-medium">⏳ Đang tải dữ liệu đơn hàng...</td></tr>`;

        try {
            // LƯU Ý: Đổi 3000 thành 8081 nếu server.js của bạn đang chạy port 8081
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
                            itemsHtml = items.map(i => `<div class="text-xs border-b border-gray-100 py-1">• ${i.title} <span class="font-bold text-gray-500">x${i.quantity||1}</span></div>`).join('');
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
            // 2. In thẳng lỗi ra UI nếu Server chưa bật hoặc sai cổng
            orderBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500 font-bold bg-red-50">❌ Lỗi kết nối Server! Vui lòng bật file server.js và kiểm tra đúng Port.</td></tr>`;
        }
    }
    // ============================================================
    // 6. CÁC HÀM GLOBAL
    // ============================================================
    window.updateOrderStatus = async (id, newStatus, currentStatus) => {
        if(!confirm(`Xác nhận đổi trạng thái đơn #${id} thành "${newStatus}"?`)) { 
            loadOrders(); 
            return; 
        }

        try {
            const res = await fetch(`http://127.0.0.1:3000/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }), // Gửi status mới lên server
                credentials: 'include'
            });
            
            const data = await res.json();
            if (data.success) {
                alert("Đã cập nhật trạng thái thành công!");
                loadOrders(); // Gọi lại hàm để cập nhật giao diện mà không cần F5
            } else {
                alert("Lỗi từ server: " + data.message);
            }
        } catch (e) {
            alert("Không thể kết nối đến Server!");
        }
    };

    window.deleteBook = async (id) => { if(confirm("Xóa sách?")) { await fetch(`http://127.0.0.1:3000/admin/delete-book/${id}`, { method: 'DELETE', credentials: 'include' }); loadBooks(); } };
    window.deleteUser = async (id, name) => { if(confirm(`Xóa ${name}?`)) { const res = await fetch(`http://127.0.0.1:3000/users/${id}`, { method: 'DELETE', credentials: 'include' }); loadUsers(); } };
    window.toggleRole = async (id, name, role) => { if(confirm("Đổi quyền?")) { await fetch(`http://127.0.0.1:3000/users/role/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ isAdmin: role }), credentials: 'include' }); loadUsers(); } };

    switchTab('books');
});