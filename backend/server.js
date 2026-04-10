// 1. IMPORT THƯ VIỆN
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise'); // Bản Promise tối ưu

// --- THÊM 3 THƯ VIỆN ĐỂ XỬ LÝ ẢNH UPLOAD ---
const multer = require('multer'); 
const fs = require('fs');
const path = require('path');

// --- THÊM THƯ VIỆN GỬI MAIL OTP ---
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const saltRounds = 10;

// ==========================================
// CẤU HÌNH UPLOAD ẢNH BẰNG MULTER
// ==========================================
// Tạo thư mục 'uploads' tự động nếu nó chưa có
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Mở cửa cho Frontend có thể load ảnh từ thư mục uploads này (rất quan trọng)
app.use('/uploads', express.static(uploadDir));

// Cấu hình Multer để nó biết lưu file ở đâu và đổi tên file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Lưu vào thư mục uploads
    },
    filename: function (req, file, cb) {
        // Đổi tên file thành Timestamp để không bao giờ bị trùng tên
        cb(null, Date.now() + path.extname(file.originalname)) 
    }
});
const upload = multer({ storage: storage });
// ==========================================

// ==========================================
// CẤU HÌNH GỬI MAIL (NODEMAILER)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // TODO: THAY EMAIL VÀ MẬT KHẨU ỨNG DỤNG CỦA BẠN VÀO ĐÂY
        user: 'nphocntt2311054@student.ctuet.edu.vn', 
        pass: 'mhutpwitzlohnyjf'        
    }
});
// ==========================================


// 2. KẾT NỐI DATABASE BẰNG POOL (Chống nghẽn server)
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'webbansach',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test kết nối
db.getConnection()
    .then(conn => {
        console.log('✅ Đã kết nối thành công với MySQL webbansach!');
        conn.release();
    })
    .catch(err => console.error('❌ Lỗi kết nối MySQL:', err.message));

// 3. CẤU HÌNH MIDDLEWARE
app.use(cors({
    origin: ['http://127.0.0.1:5501', 'http://127.0.0.1:5502', 'http://localhost:5501', 'http://localhost:5502', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

app.use(session({
    secret: 'mot-chuoi-bi-mat-rat-dai-va-kho-doan',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
// Cho phép Frontend truy cập vào thư mục uploads để lấy ảnh hiện lên web
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MIDDLEWARE BẢO MẬT ADMIN
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin === 1) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Phiên đăng nhập hết hạn do Server khởi động lại. Vui lòng ĐĂNG XUẤT và ĐĂNG NHẬP LẠI!' });
    }
};

// ==========================================
// 4. DANH SÁCH API 
// ==========================================

app.get('/', (req, res) => {
    res.send('Chào bạn, đây là Backend của Online Book (Bản xịn)!');
});

// --- XÁC THỰC ---
app.post('/register', async (req, res) => {
    // 1. Chỉ lấy username, password và email từ giao diện gửi xuống
    const { username, password, email } = req.body;
    
    // 2. Kiểm tra xem người dùng có điền thiếu ô nào không
    if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin.' });
    }

    try {
        // 3. Kiểm tra xem tên đăng nhập đã có ai dùng chưa
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });

        // 4. Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 5. Lưu vào Database (chỉ lưu 3 cột kia và gán sẵn role là 'user')
        await db.query(
            `INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, 'user')`,
            [username, hashedPassword, email]
        );
        
        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        res.status(500).json({ success: false, message: 'Lỗi Database: ' + error.message });
    }  
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = results[0];    

        if (!user) return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const checkAdmin = (Number(user.isAdmin) === 1 || user.role === 'admin') ? 1 : 0;
            req.session.user = { id: user.id, username: user.username, isAdmin: checkAdmin };
            res.json({ success: true, message: 'Đăng nhập thành công!', user: req.session.user });
        } else {
            res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Database: ' + error.message });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.json({ success: false, message: 'Lỗi khi đăng xuất.' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Đăng xuất thành công.' });
    });
});

// --- SÁCH ---
app.get('/books', async (req, res) => {
    const searchQuery = req.query.q;
    const categoryQuery = req.query.category;

    try {
        const [books] = await db.query("SELECT * FROM books ORDER BY id DESC");
        let filteredBooks = books;

        if (categoryQuery) {
            filteredBooks = filteredBooks.filter(book => book.category_id != null && String(book.category_id).trim() === String(categoryQuery).trim());
        }
        if (searchQuery) {
            const keyword = searchQuery.toLowerCase();
            filteredBooks = filteredBooks.filter(book => {
                return (book.title && book.title.toLowerCase().includes(keyword)) || 
                       (book.author && book.author.toLowerCase().includes(keyword));
            });
        }
        res.json({ success: true, books: filteredBooks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + error.message });
    }
});

app.get('/books/:id', async (req, res) => {
    try {
        const [results] = await db.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
        if (!results[0]) return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        res.json({ success: true, book: results[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ==========================================
// API THÊM SÁCH
// ==========================================
app.post('/books', upload.single('imageFile'), async (req, res) => { 
    const { title, author, category, price, description, stock, imageUrl } = req.body;
    
    let finalImageUrl = '';
    if (req.file) { 
        finalImageUrl = 'http://localhost:3000/uploads/' + req.file.filename;
    } else if (imageUrl && imageUrl.trim() !== '') {
        finalImageUrl = imageUrl;
    } else {
        finalImageUrl = 'https://placehold.co/100x150?text=No+Image'; 
    }

    try {
        const stockValue = stock ? parseInt(stock) : 1;
        const priceValue = price ? parseFloat(price) : 0;
        const categoryIdValue = parseInt(category); 

        if (isNaN(categoryIdValue)) {
            return res.json({ 
                success: false, 
                message: "Lỗi: Danh mục (category) gửi lên không phải là số. Hãy sửa lại value='1', value='2'... trong thẻ <select> ở file admin.html!" 
            });
        }
        
        const sqlQuery = `INSERT INTO books (title, author, category_id, price, description, image_url, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.query(sqlQuery, [
            title, author, categoryIdValue, priceValue, description, finalImageUrl, stockValue
        ]);
        
        res.json({ success: true, message: 'Thêm sách thành công!', id: result.insertId });
    } catch (error) {
        console.error("Lỗi khi thêm sách:", error);
        res.json({ success: false, message: error.message });
    }
});

app.put('/books/:id', async (req, res) => {
    const { title, author, category, price, description, imageUrl, stock } = req.body;
    try {
        await db.query(
            `UPDATE books SET title = ?, author = ?, category_id = ?, price = ?, description = ?, image_url = ?, stock = ? WHERE id = ?`,
            [title, author, category, price, description, imageUrl, stock, req.params.id]
        );
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.delete('/admin/delete-book/:id', checkAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        res.json({ success: true, message: 'Xóa sách thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa sách.' });
    }
});

app.put('/admin/update-book/:id', async (req, res) => {
    const bookId = req.params.id;
    const newStock = req.body.stock; 

    try {
        const sql = "UPDATE books SET stock = ? WHERE id = ?";
        await db.query(sql, [newStock, bookId]);
        res.json({ success: true, message: "Cập nhật kho thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật kho:", error);
        res.json({ success: false, message: "Lỗi Database khi cập nhật kho" });
    }
});

app.put('/admin/edit-book/:id', async (req, res) => {
    const bookId = req.params.id;
    const { title, author, price } = req.body; 
    
    try {
        const sql = "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?";
        await db.query(sql, [title, author, price, bookId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi khi cập nhật sách:", error);
        res.json({ success: false, message: "Lỗi khi cập nhật sách" });
    }
});

// --- ĐƠN HÀNG KHÁCH VÃNG LAI ---
app.post('/order', async (req, res) => {
    const { customer_name, phone, address, total_price, items } = req.body;
    if (!customer_name || !phone || !address || !items) return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin.' });
    
    try {
        if (Array.isArray(items)) {
            for (const item of items) {
                const [bookInfo] = await db.query("SELECT stock, title FROM books WHERE id = ?", [item.id]);
                const currentStock = bookInfo[0]?.stock || 0;
                const qtyToBuy = item.quantity ? parseInt(item.quantity) : 1;

                if (qtyToBuy > currentStock) {
                    return res.json({ 
                        success: false, 
                        message: `Lỗi: Sách "${bookInfo[0].title}" chỉ còn ${currentStock} quyển trong kho!` 
                    });
                }
            }
        }

        const [result] = await db.query(
            `INSERT INTO orders (customer_name, phone, address, total_price, items, status) VALUES (?, ?, ?, ?, ?, 'Đang xử lý')`,
            [customer_name, phone, address, total_price, JSON.stringify(items)]
        );

        if (Array.isArray(items)) {
            for (const item of items) {
                if (item.id) {
                    const qty = item.quantity ? parseInt(item.quantity) : 1;
                    await db.query("UPDATE books SET stock = stock - ? WHERE id = ?", [qty, item.id]);
                }
            }
        }

        res.json({ success: true, message: 'Đặt hàng thành công!', orderId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- ĐƠN HÀNG USER ĐÃ ĐĂNG NHẬP ---
app.post('/checkout', async (req, res) => {
    const { user_id, customer_name, phone, address, items, total_price } = req.body;
    try {
        if (Array.isArray(items)) {
            for (const item of items) {
                const [bookInfo] = await db.query("SELECT stock, title FROM books WHERE id = ?", [item.id]);
                const currentStock = bookInfo[0]?.stock || 0;
                const qtyToBuy = item.quantity ? parseInt(item.quantity) : 1;

                if (qtyToBuy > currentStock) {
                    return res.json({ 
                        success: false, 
                        message: `Lỗi: Sách "${bookInfo[0].title}" chỉ còn ${currentStock} quyển trong kho!` 
                    });
                }
            }
        }

        const [result] = await db.query(
            `INSERT INTO orders (user_id, customer_name, phone, address, items, total_price, status) VALUES (?, ?, ?, ?, ?, ?, 'Đang xử lý')`,
            [user_id, customer_name, phone, address, JSON.stringify(items), total_price]
        );

        if (Array.isArray(items)) {
            for (const item of items) {
                if (item.id) {
                    const qty = item.quantity ? parseInt(item.quantity) : 1;
                    await db.query("UPDATE books SET stock = stock - ? WHERE id = ?", [qty, item.id]);
                }
            }
        }

        res.json({ success: true, message: 'Đặt hàng thành công!', orderId: result.insertId });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

app.get('/my-orders/:userId', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", [req.params.userId]);
        res.json({ success: true, orders: rows });
    } catch (error) {
        res.json({ success: false, message: 'Lỗi lấy dữ liệu' });
    }
});

app.get('/admin/orders', checkAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM orders ORDER BY id DESC");
        res.json({ success: true, orders: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

app.put('/admin/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const { status: newStatus } = req.body; 

    try {
        const [orders] = await db.query('SELECT status, items FROM orders WHERE id = ?', [orderId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        
        const order = orders[0];
        const oldStatus = order.status;

        let items = [];
        try {
            if (typeof order.items === 'string') {
                if (order.items === '[object Object]') items = [];
                else items = JSON.parse(order.items);
            } else {
                items = order.items || [];
            }
        } catch (e) {
            console.error("Lỗi parse items tại Backend:", e);
        }

        if ((newStatus === 'Trả hàng' || newStatus === 'Đã hủy' || newStatus === 'Hủy đơn') && 
            (oldStatus !== 'Trả hàng' && oldStatus !== 'Đã hủy' && oldStatus !== 'Hủy đơn')) {
            
            for (const item of items) {
                if(item.id) {
                    const qty = item.quantity ? parseInt(item.quantity) : 1;
                    await db.query('UPDATE books SET stock = stock + ? WHERE id = ?', [qty, item.id]);
                }
            }
        }

        await db.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);

        res.json({ success: true, message: "Cập nhật trạng thái thành công" });
    } catch (error) {
        console.error("Lỗi cập nhật đơn hàng:", error);
        res.status(500).json({ success: false, message: "Lỗi Server nội bộ" });
    }
});

// --- TÀI KHOẢN & BẢO MẬT ---
app.get('/get-security-question/:username', async (req, res) => {
    try {
        const [results] = await db.query("SELECT securityQuestion FROM users WHERE username = ?", [req.params.username]);
        if (results[0]) {
            res.json({ success: true, question: results[0].securityQuestion || "Bạn chưa thiết lập câu hỏi bảo mật." });
        } else {
            res.json({ success: false, message: 'Tài khoản không tồn tại!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi Server' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { username, answer, newPassword } = req.body;
    try {
        const [results] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        const user = results[0];
        
        if (!user) return res.json({ success: false, message: 'Tài khoản không tồn tại.' });

        if (user.securityAnswer && user.securityAnswer.toLowerCase() === answer.trim().toLowerCase()) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
            res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
        } else {
            res.json({ success: false, message: 'Câu trả lời bảo mật không đúng!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
});

// ==========================================
// THÊM MỚI: 2 API QUÊN MẬT KHẨU BẰNG OTP
// ==========================================

// 1. Gửi mã OTP vào Email
app.post('/api/forgot-password-otp', async (req, res) => {
    const { email } = req.body;

    try {
        // LƯU Ý QUAN TRỌNG: Lệnh SQL này giả định trong bảng 'users' của bạn có cột tên là 'email'
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.json({ success: false, message: 'Email này không tồn tại trong hệ thống!' });
        }

        // Tạo mã OTP 6 số ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        

        // Lưu OTP và ExpireTime vào Database
        await db.query('UPDATE users SET reset_otp = ?, reset_otp_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?', [otp, email]);

        // Cấu hình gửi mail
        const mailOptions = {
            from: 'BookNè Support <nhap_email_cua_ban_vao_day@gmail.com>', // Thay lại email gửi
            to: email,
            subject: 'Mã xác nhận khôi phục mật khẩu - BookNè',
            html: `
                <h3>Xin chào!</h3>
                <p>Bạn vừa yêu cầu đặt lại mật khẩu tại hệ thống BookNè.</p>
                <p>Mã xác nhận (OTP) của bạn là: <strong style="font-size: 24px; color: #10b981;">${otp}</strong></p>
                <p>Mã này sẽ hết hạn sau 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Đã gửi mã OTP vào email của bạn!' });

    } catch (error) {
        console.error("Lỗi khi gửi email OTP:", error);
        res.json({ success: false, message: 'Lỗi hệ thống khi gửi email. Hãy kiểm tra lại tài khoản Gmail Admin!' });
    }
});

// 2. Xác nhận OTP và Đổi mật khẩu
app.post('/api/reset-password-otp', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.json({ success: false, message: 'Lỗi dữ liệu: Không tìm thấy Email!' });
        }

        const user = users[0];

        // Kiểm tra mã OTP
        if (user.reset_otp !== otp) {
            return res.json({ success: false, message: 'Mã OTP không chính xác!' });
        }
        
        // Kiểm tra thời hạn OTP
        if (new Date() > new Date(user.reset_otp_expires)) {
            return res.json({ success: false, message: 'Mã OTP đã hết hạn! Vui lòng yêu cầu mã mới.' });
        }

        // Mã hóa mật khẩu mới y như lúc đăng ký
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Lưu mật khẩu mới và Xóa trắng mã OTP
        await db.query(
            'UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expires = NULL WHERE email = ?', 
            [hashedPassword, email]
        );

        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });

    } catch (error) {
        console.error("Lỗi xác nhận OTP:", error);
        res.json({ success: false, message: 'Lỗi hệ thống khi đổi mật khẩu.' });
    }
});
// ==========================================

app.get('/users', checkAdmin, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, role FROM users ORDER BY id DESC");
        const mappedUsers = rows.map(u => ({ id: u.id, username: u.username, isAdmin: u.role === 'admin' ? 1 : 0 }));
        res.json({ success: true, users: mappedUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

app.delete('/users/:id', checkAdmin, async (req, res) => {
    if (parseInt(req.params.id) === parseInt(req.session.user.id)) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }
    try {
        await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: 'Đã xóa người dùng thành công.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

app.put('/users/role/:id', checkAdmin, async (req, res) => {
    if (parseInt(req.params.id) === parseInt(req.session.user.id)) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự thay đổi quyền của chính mình!' });
    }
    try {
        const newRole = req.body.isAdmin ? 'admin' : 'user';
        await db.query("UPDATE users SET role = ? WHERE id = ?", [newRole, req.params.id]);
        res.json({ success: true, message: 'Cập nhật quyền thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// 5. KHỞI ĐỘNG
app.listen(PORT, () => {
    console.log(`🚀 Máy chủ Backend đang chạy rần rần tại http://localhost:${PORT}`);
});