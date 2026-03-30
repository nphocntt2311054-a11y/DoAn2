// frontend/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageEl = document.getElementById('message');

    registerForm.addEventListener('submit', async (e) => {
        // Ngăn form tự động gửi đi
        e.preventDefault(); 

        // 1. Lấy dữ liệu từ các ô input
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const securityQuestion = document.getElementById('securityQuestion').value;
        const securityAnswer = document.getElementById('securityAnswer').value;

        // 2. Gửi dữ liệu đến Backend
        try {
            const response = await fetch('http://127.0.0.1:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Chuyển dữ liệu thành chuỗi JSON
                body: JSON.stringify({ 
                    username, 
                    password, 
                    securityQuestion, 
                    securityAnswer 
                }),
                credentials: 'include'
            });

            const result = await response.json(); // Đọc kết quả backend trả về

            if (result.success) {
                // Nếu thành công
                messageEl.textContent = 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...';
                messageEl.style.color = 'green';
                // Chờ 2 giây rồi chuyển sang trang login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Nếu thất bại
                messageEl.textContent = result.message; // Hiển thị lỗi (VD: Tên đăng nhập đã tồn tại)
                messageEl.style.color = 'red';
            }

        } catch (error) {
            console.error('Lỗi khi đăng ký:', error);
            messageEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
            messageEl.style.color = 'red';
        }
    });
});