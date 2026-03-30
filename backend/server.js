// 1. GỌI TẤT CẢ THƯ VIỆN LÊN ĐẦU
const express = require('express');
const cors = require('cors');
const session = require('express-session'); 
const bcrypt = require('bcrypt'); 
const mysql = require('mysql2'); // <-- ĐÃ ĐỔI SANG THƯ VIỆN MYSQL

// 2. KHỞI TẠO CÁC BIẾN CHÍNH
const app = express();
const PORT = 3000;
const saltRounds = 10; 

// 3. KẾT NỐI DATABASE MYSQL (Thay cho file database.js cũ)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456', 
    database: 'webbansach' 
});

db.connect(err => {
    if (err) {
        console.error('❌ Lỗi kết nối MySQL:', err);
        return;
    }
    console.log('✅ Đã kết nối thành công với MySQL webbansach!');
});

// 4. SỬ DỤNG MIDDLEWARE (Cấu hình)
app.use(cors({
    origin: ['http://127.0.0.1:5501', 'http://127.0.0.1:5502', 'http://localhost:5501', 'http://localhost:5502', 'http://localhost:5173'], // T thêm sẵn cổng 5173 phòng hờ
    credentials: true 
}));
app.use(express.json()); 

app.use(session({
    secret: 'mot-chuoi-bi-mat-rat-dai-va-kho-doan', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// 5. "NGƯỜI GÁC CỔNG" (Middleware Tùy chỉnh)
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin === 1) {
        next(); 
    } else {
        res.status(403).json({ success: false, message: 'Yêu cầu quyền Admin.' });
    }
};

// ========================================================
// 6. CÁC API BÊN DƯỚI ĐÃ ĐƯỢC CHUYỂN SANG CHUẨN MYSQL
// ========================================================

app.get('/', (req, res) => {
    res.send('Chào bạn, đây là Backend của Online Book (Bản MySQL)!');
});

// --- API Về Xác thực (Auth) ---
app.post('/register', async (req, res) => {
    const { username, password, securityQuestion, securityAnswer } = req.body;

    if (!username || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const hashedAnswer = await bcrypt.hash(securityAnswer, saltRounds);

        const sql = `INSERT INTO Users (username, password, securityQuestion, securityAnswer) VALUES (?, ?, ?, ?)`;

        db.query(sql, [username, hashedPassword, securityQuestion, hashedAnswer], (err, result) => {
            if (err) {
                console.error(err.message);
                return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });
            }
            console.log(`Một user mới đã được tạo với ID: ${result.insertId}`);
            res.json({ success: true, message: 'Đăng ký thành công!' });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM Users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi Database.' });
        
        // MySQL trả về mảng, nên lấy phần tử đầu tiên
        const user = results[0]; 

        if (!user) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    isAdmin: user.isAdmin
                };
                console.log('User đã đăng nhập:', req.session.user);

                res.json({ 
                    success: true, 
                    message: 'Đăng nhập thành công!',
                    user: {
                        id: user.id,
                        username: user.username,
                        isAdmin: user.isAdmin
                    }
                });
            } else {
                res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Lỗi khi so sánh mật khẩu.' });
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.json({ success: false, message: 'Lỗi khi đăng xuất.' });
        res.clearCookie('connect.sid'); 
        res.json({ success: true, message: 'Đăng xuất thành công.' });
    });
}); 

// --- API LẤY SÁCH ---
app.get('/books', (req, res) => {
    const searchQuery = req.query.q; 
    const categoryQuery = req.query.category; 

    const sql = "SELECT * FROM Books ORDER BY id DESC";

    db.query(sql, [], (err, books) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
        }

        let filteredBooks = books;

        if (categoryQuery) {
            filteredBooks = filteredBooks.filter(book => 
                book.category && book.category.toLowerCase() === categoryQuery.toLowerCase()
            );
        }

        if (searchQuery) {
            const keyword = searchQuery.toLowerCase();
            filteredBooks = filteredBooks.filter(book => {
                const titleMatch = book.title && book.title.toLowerCase().includes(keyword);
                const authorMatch = book.author && book.author.toLowerCase().includes(keyword);
                return titleMatch || authorMatch;
            });
        }
        
        res.json({ success: true, books: filteredBooks });
    });
});

app.get('/books/:id', (req, res) => {
    const id = req.params.id; 

    const sql = "SELECT * FROM Books WHERE id = ?";
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server.' });
        
        const book = results[0];
        if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        
        res.json({ success: true, book: book });
    });
});

app.post('/books', (req, res) => {
    const { title, author, category, price, description, imageUrl, stock, position } = req.body;

    const sql = `INSERT INTO Books (title, author, category, price, description, imageUrl, stock, position) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const stockValue = stock ? parseInt(stock) : 1;
    const positionValue = position || 'new'; 

    db.query(sql, [title, author, category, price, description, imageUrl, stockValue, positionValue], (err, result) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: 'Thêm sách thành công!', id: result.insertId });
    });
});

app.put('/books/:id', (req, res) => {
    const { title, author, category, price, description, imageUrl, stock } = req.body;
    const { id } = req.params;

    const sql = `UPDATE Books SET title = ?, author = ?, category = ?, price = ?, description = ?, imageUrl = ?, stock = ? WHERE id = ?`;

    db.query(sql, [title, author, category, price, description, imageUrl, stock, id], (err, result) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: 'Cập nhật thành công!' });
    });
});

app.delete('/admin/delete-book/:id', checkAdmin, (req, res) => {
    const bookId = req.params.id; 
    const sql = 'DELETE FROM Books WHERE id = ?';
    
    db.query(sql, [bookId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi khi xóa sách.' });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sách.' });
        }
        res.json({ success: true, message: 'Xóa sách thành công!' });
    });
});

// --- API ĐẶT HÀNG ---
app.post('/order', (req, res) => {
    const { customer_name, phone, address, total_price, items } = req.body;

    if (!customer_name || !phone || !address || !items) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const sql = `INSERT INTO Orders (customer_name, phone, address, total_price, items) VALUES (?, ?, ?, ?, ?)`;
    const itemsString = JSON.stringify(items);

    db.query(sql, [customer_name, phone, address, total_price, itemsString], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi khi lưu đơn hàng.' });
        res.json({ success: true, message: 'Đặt hàng thành công!', orderId: result.insertId });
    });
});

// --- CÁC API KHÁC ---
app.get('/get-security-question/:username', (req, res) => {
    const username = req.params.username;
    const sql = "SELECT securityQuestion FROM Users WHERE username = ?";
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi Server' });
        
        const row = results[0];
        if (row) {
            const question = row.securityQuestion || "Bạn chưa thiết lập câu hỏi bảo mật.";
            res.json({ success: true, question: question });
        } else {
            res.json({ success: false, message: 'Tài khoản không tồn tại!' });
        }
    });
});

app.post('/reset-password', (req, res) => {
    const { username, answer, newPassword } = req.body;

    const sqlGet = "SELECT * FROM Users WHERE username = ?";
    db.query(sqlGet, [username], async (err, results) => {
        const user = results[0];
        if (err || !user) return res.json({ success: false, message: 'Lỗi hệ thống hoặc sai tên đăng nhập.' });
        
        if (user.securityAnswer && user.securityAnswer.toLowerCase() === answer.trim().toLowerCase()) {
            try {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const sqlUpdate = "UPDATE Users SET password = ? WHERE id = ?";
                db.query(sqlUpdate, [hashedPassword, user.id], (err) => {
                    if (err) return res.json({ success: false, message: 'Lỗi Update DB' });
                    res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
                });
            } catch (error) {
                res.status(500).json({ success: false, message: 'Lỗi mã hóa mật khẩu.' });
            }
        } else {
            res.json({ success: false, message: 'Câu trả lời bảo mật không đúng!' });
        }
    });
});

app.post('/checkout', (req, res) => {
    const { user_id, customer_name, phone, address, items, total_price } = req.body;
    const itemsString = JSON.stringify(items); 
    const sql = `INSERT INTO Orders (user_id, customer_name, phone, address, items, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const status = 'Đang xử lý';
    
    db.query(sql, [user_id, customer_name, phone, address, itemsString, total_price, status], (err, result) => {
        if (err) return res.json({ success: false, message: 'Lỗi lưu đơn hàng' });
        res.json({ success: true, message: 'Đặt hàng thành công!', orderId: result.insertId });
    });
});

app.get('/my-orders/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = "SELECT * FROM Orders WHERE user_id = ? ORDER BY id DESC";
    db.query(sql, [userId], (err, rows) => {
        if (err) return res.json({ success: false, message: 'Lỗi lấy dữ liệu' });
        res.json({ success: true, orders: rows });
    });
});

app.get('/users', checkAdmin, (req, res) => {
    const sql = "SELECT id, username, isAdmin FROM Users ORDER BY id DESC";
    db.query(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server.' });
        res.json({ success: true, users: rows });
    });
});

app.delete('/users/:id', checkAdmin, (req, res) => {
    const idToDelete = req.params.id;
    const currentAdminId = req.session.user.id; 

    if (parseInt(idToDelete) === parseInt(currentAdminId)) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình!' });
    }

    const sql = "DELETE FROM Users WHERE id = ?";
    db.query(sql, [idToDelete], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server.' });
        res.json({ success: true, message: 'Đã xóa người dùng thành công.' });
    });
});

app.put('/users/role/:id', checkAdmin, (req, res) => {
    const targetId = req.params.id;
    const { isAdmin } = req.body; 
    const currentAdminId = req.session.user.id;

    if (parseInt(targetId) === parseInt(currentAdminId)) {
        return res.status(400).json({ success: false, message: 'Bạn không thể tự thay đổi quyền của chính mình!' });
    }

    const sql = "UPDATE Users SET isAdmin = ? WHERE id = ?";
    db.query(sql, [isAdmin, targetId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server.' });
        res.json({ success: true, message: 'Cập nhật quyền thành công!' });
    });
});

app.get('/admin/orders', checkAdmin, (req, res) => {
    const sql = "SELECT * FROM Orders ORDER BY id DESC";
    db.query(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi server' });
        res.json({ success: true, orders: rows });
    });
});

app.put('/admin/orders/:id', checkAdmin, (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; 

    const sql = "UPDATE Orders SET status = ? WHERE id = ?";
    db.query(sql, [status, orderId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi update status' });
        res.json({ success: true, message: 'Cập nhật trạng thái thành công!' });
    });
});

// 7. KHỞI ĐỘNG MÁY CHỦ
app.listen(PORT, () => {
    console.log(`🚀 Máy chủ Backend đang chạy rần rần tại http://localhost:${PORT}`);
});