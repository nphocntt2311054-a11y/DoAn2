// frontend/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageEl = document.getElementById('message');

    registerForm.addEventListener('submit', async (e) => {
        // Ngăn form tự động gửi đi để xử lý bằng JS
        e.preventDefault(); 

        // 1. Chỉ lấy đúng 3 dữ liệu từ các ô input hiện có
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;

        // 2. Gửi dữ liệu đến Backend
        try {
            const response = await fetch('http://127.0.0.1:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Đóng gói 3 biến này thành JSON gửi đi
                body: JSON.stringify({ 
                    username, 
                    password, 
                    email 
                }),
                credentials: 'include'
            });

            const result = await response.json(); 

            if (result.success) {
                // Nếu backend báo thành công
                messageEl.textContent = 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...';
                messageEl.style.color = 'green';
                // Chờ 2 giây rồi chuyển sang login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Nếu thất bại (vd: trùng tên)
                messageEl.textContent = result.message; 
                messageEl.style.color = 'red';
            }

        } catch (error) {
            console.error('Lỗi khi đăng ký:', error);
            messageEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
            messageEl.style.color = 'red';
        }
    });
});