// frontend/common.js - PHIÊN BẢN CHUẨN

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    updateHeaderUser();
    setupSearch();
});

// 1. GIỎ HÀNG
function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;

    const cart = JSON.parse(localStorage.getItem('shopping-cart')) || [];
    const totalQuantity = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    cartCountEl.textContent = totalQuantity;
    
    if (totalQuantity > 0) {    
        cartCountEl.classList.remove('hidden'); 
        cartCountEl.style.display = 'flex';
    } else {
        cartCountEl.classList.add('hidden');    
        cartCountEl.style.display = 'none';
    }
}

// 2. TÀI KHOẢN
function updateHeaderUser() {
    const accountArea = document.getElementById('account-area');
    let user = null;

    // Xử lý lỗi dữ liệu rác (undefined)
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser && storedUser !== "undefined") {
            user = JSON.parse(storedUser);
        }
    } catch (e) {
        console.error("Lỗi dữ liệu user, reset...", e);
        localStorage.removeItem('currentUser');
    }

    if (!accountArea) return;

    if (user) {
        // NẾU ĐÃ ĐĂNG NHẬP
        const firstLetter = (user.username ? user.username[0] : 'U').toUpperCase();
        
        accountArea.innerHTML = `
            <div class="relative group cursor-pointer z-[1000]">
                <div class="flex items-center gap-2 py-2">
                    <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm text-sm">
                        ${firstLetter}
                    </div>
                    <span class="font-semibold text-gray-700 text-sm hidden md:inline truncate max-w-[120px]">
                         ${user.username}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div class="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-[1000]">
                    <div class="py-1">
                        <div class="px-4 py-2 border-b border-gray-50 text-xs text-gray-400 uppercase font-bold">
                            Tài khoản
                        </div>
                        <a href="history.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                        Lịch sử mua hàng</a>
                        <div class="border-t border-gray-100 my-1"></div>
                        <button onclick="handleLogout()" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // NẾU CHƯA ĐĂNG NHẬP (Giữ nguyên nút cũ)
        accountArea.innerHTML = `
            <a href="login.html" class="flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-colors font-medium">
                <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span class="hidden md:inline">Đăng nhập</span>
            </a>
        `;
    }
}

// 3. HÀM ĐĂNG XUẤT & TÌM KIẾM
function handleLogout() {
    if(confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const keyword = searchInput.value.trim();
                if (keyword) {
                    window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
                }
            }
        });
    }
}