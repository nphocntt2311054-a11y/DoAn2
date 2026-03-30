
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageEl = document.getElementById('message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://127.0.0.1:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
               if (result.user) {
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    alert('Đăng nhập thành công!');
                    window.location.href = 'trangchu.html';
                } else {
                    console.error("Lỗi: Server báo thành công nhưng không trả về User!", result);
                     alert('Lỗi hệ thống: Đăng nhập thành công nhưng không lấy được thông tin!');
                }
            } else {
                messageEl.textContent = result.message; 
                messageEl.style.color = 'red';
            }

        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            messageEl.textContent = 'Lỗi kết nối. Vui lòng thử lại.';
            messageEl.style.color = 'red';
        }
    });
});