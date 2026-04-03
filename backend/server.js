// 1. IMPORT THƯ VIỆN
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise'); // Bản Promise tối ưu

const app = express();
const PORT = 3000;
const saltRounds = 10;

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
    const { username, password, securityQuestion, securityAnswer } = req.body;
    if (!username || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin.' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const hashedAnswer = await bcrypt.hash(securityAnswer, saltRounds);

        await db.query(
            `INSERT INTO users (username, password, securityQuestion, securityAnswer, role) VALUES (?, ?, ?, ?, 'user')`,
            [username, hashedPassword, securityQuestion, hashedAnswer]
        );
        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
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

app.post('/books', async (req, res) => {
    const { title, author, category, price, description, imageUrl, stock } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO books (title, author, category_id, price, description, image_url, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, author, category, price, description, imageUrl, stock ? parseInt(stock) : 1]
        );
        res.json({ success: true, message: 'Thêm sách thành công!', id: result.insertId });
    } catch (error) {
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
// API Cập nhật số lượng tồn kho của sách
app.put('/admin/update-book/:id', (req, res) => {
    const bookId = req.params.id;
    const newStock = req.body.stock; // Số lượng mới gửi từ Frontend lên

    const sql = "UPDATE books SET stock = ? WHERE id = ?";
    db.query(sql, [newStock, bookId], (err, result) => {
        if (err) {
            console.error("Lỗi cập nhật kho:", err);
            return res.json({ success: false, message: "Lỗi Database khi cập nhật kho" });
        }
        return res.json({ success: true, message: "Cập nhật kho thành công!" });
    });
});
// --- ĐƠN HÀNG (ĐÃ THÊM LOGIC TRỪ KHO KHI MUA) ---
app.post('/order', async (req, res) => {
    const { customer_name, phone, address, total_price, items } = req.body;
    if (!customer_name || !phone || !address || !items) return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin.' });
    try {
        const [result] = await db.query(
            `INSERT INTO orders (customer_name, phone, address, total_price, items, status) VALUES (?, ?, ?, ?, ?, 'Đang xử lý')`,
            [customer_name, phone, address, total_price, JSON.stringify(items)]
        );

        // THÊM: TRỪ TỒN KHO
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

app.post('/checkout', async (req, res) => {
    const { user_id, customer_name, phone, address, items, total_price } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO orders (user_id, customer_name, phone, address, items, total_price, status) VALUES (?, ?, ?, ?, ?, ?, 'Đang xử lý')`,
            [user_id, customer_name, phone, address, JSON.stringify(items), total_price]
        );

        // THÊM: TRỪ TỒN KHO
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

// API CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (ĐÃ FIX LỖI PROMISE & THÊM LOGIC CỘNG LẠI KHO KHI HỦY)
app.put('/admin/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const { status: newStatus } = req.body; 

    try {
        const [orders] = await db.query('SELECT status, items FROM orders WHERE id = ?', [orderId]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        
        const order = orders[0];
        const oldStatus = order.status;

        // Xử lý an toàn JSON
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

        // CỘNG LẠI KHO nếu chuyển sang Hủy hoặc Trả hàng
        if ((newStatus === 'Trả hàng' || newStatus === 'Đã hủy' || newStatus === 'Hủy đơn') && 
            (oldStatus !== 'Trả hàng' && oldStatus !== 'Đã hủy' && oldStatus !== 'Hủy đơn')) {
            
            for (const item of items) {
                if(item.id) {
                    const qty = item.quantity ? parseInt(item.quantity) : 1;
                    await db.query('UPDATE books SET stock = stock + ? WHERE id = ?', [qty, item.id]);
                }
            }
        }

        // Cập nhật trạng thái vào database
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