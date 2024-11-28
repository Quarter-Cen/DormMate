const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
const QRCode = require('qrcode')
const generatePayload = require('promptpay-qr')
const _ = require('lodash')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Constants
const PORT = 8000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8000/oauth2callback';
const SECRET = 'sawaddeekub'

// Middleware
app.use(cors());
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(bodyparser.urlencoded({ extended: true }))
// MySQL Connection
let conn = null;
let pendingQRRequests = [];
let pendingAdminResponse = [];

const initMysql = async () => {
    conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'dormmate',
    });
};

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/jfif', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, PNG, JFIF, or WEBP files are allowed.'));
        }
    },
});

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    let authToken = ''
    if (authHeader) {
        authToken = authHeader.split(' ')[1]

    }

    if (authToken == null) {
        return res.status(401).json({ message: 'Token not found' });
    }

    try {
        const user = jwt.verify(authToken, SECRET);
        req.user = user;

        // Execute the query to find user's room and role
        const [result] = await conn.query(
            `SELECT 
                u.user_id,
                ur.room_num,
                CASE 
                    WHEN a.user_id IS NOT NULL THEN 'admin'
                    ELSE 'user' 
                END AS role
            FROM 
                users u
            LEFT JOIN 
                admins a ON a.user_id = u.user_id
            LEFT JOIN
                users_rooms ur ON ur.user_id = u.user_id
            WHERE u.user_id = ? `, [req.user.id]);

        if (result.length > 0) {
            req.user.room = result[0].room_num;
            req.user.role = result[0].role;
        } else {
            return res.status(403).json({ message: 'User has no assigned room or role' });
        }
        next(); // Continue to the next middleware or route handler
    } catch (err) {
        // Handle token verification error
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const authorizeOwnData = (req, res, next) => {
    const userId = req.user.id; // ID ของผู้ใช้จาก token
    const resourceId = parseInt(req.params.id, 10); // ID ของข้อมูลที่ร้องขอจาก URL parameters
    const userRole = req.user.role;
    const room = req.user.room

    if (userRole === 'admin') {
        return next();
    }

    if (room !== resourceId) {
        return res.status(403).json({
            message: 'Access denied',
            UID: userId,
            room
        });
    }

    next();
};

const authorizeBillDetailsAccess = async (req, res, next) => {
    const roomId = req.user.room;
    const userRole = req.user.role;
    let BillId = parseInt(req.params.id, 10);

    try {
        if (userRole === 'admin') {
            return next();
        }
        if (!BillId) {
            const [defaults] = await conn.query(
                `SELECT bill_id FROM bills 
                WHERE room_num = ? 
                LIMIT 1`,
                [roomId]
            );
            BillId = defaults[0].bill_id

        }

        const [rows] = await conn.query(
            `SELECT * FROM bills
             WHERE bill_id = ? AND room_num = ?`,
            [BillId, roomId]
        );

        if (rows.length === 0 || (userRole !== 'admin' && userRole !== 'user')) {
            return res.status(403).json({
                message: 'Access denied: You do not have access to this room',
                UID: req.user.id,
                room: req.user.room
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Database error', error: error.message });
    }
}


// Data Validation
const validateData = (userData) => {
    let errors = [];
    if (!userData.firstname) errors.push('กรุณาใส่ชื่อ');
    if (!userData.lastname) errors.push('กรุณาใส่นามสกุล');
    if (!userData.nickname) errors.push('กรุณาใส่ชื่อเล่น');
    if (!userData.age) errors.push('กรุณาใส่อายุ');
    if (!userData.gender) errors.push('กรุณาเลือกเพศ');
    if (!userData.address) errors.push('กรุณาใส่ที่อยู่ตามบัตรประชาชน');
    if (!userData.email) errors.push('กรุณาใส่อีเมล์');
    if (!userData.password) errors.push('กรุณาใส่รหัสผ่าน');
    if (!userData.confirmPassword) errors.push('กรุณายืนยันรหัสผ่าน');
    if (!userData.uniqueCode) errors.push('กรุณาใส่รหัสเฉพาะ');
    return errors;
};

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Routes
app.get('/', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/payment/detail', (req, res) => {
    // ตรวจสอบว่าเส้นทางของไฟล์ถูกต้อง
    res.sendFile(path.join(__dirname, '..', 'payment', 'detail.html'));
});

app.get('/auth/google', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.json({ authUrl });
});

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.redirect(`/mail.html?access_token=${tokens.access_token}`);
});



app.get(`/getBills`, authenticateToken, authorizeOwnData, async (req, res) => {
    try {
        let id = req.params.id;
        let bill = []
        let room = req.user.room

        if (id === null || id === undefined || id === 'null' || id === '') {
            id = req.user.room
        }

        if (req.user.role === 'admin') {
            [bill] = await conn.query(`SELECT * FROM bills`);

            return res.json({ bill, message: 'use in stat' });
        } else {
            [bill] = await conn.query(`SELECT * FROM bills WHERE room_num = ?`, [room]);
        }


        if (bill.length === 0) {
            return res.status(404).json({ message: 'No bill found for this room' });
        }

        res.json(bill);
    } catch (error) {
        console.error('Error fetching bill:', error.message);
        res.status(500).json({ error: 'Error fetching bill' });
    }
});

app.get(`/getBills/:id?`, authenticateToken, authorizeOwnData, async (req, res) => {
    try {
        let id = req.params.id;
        let bill = []
        let room = req.user.room

        if (req.user.role === 'admin' && (id === null || id === undefined || id === 'null' || id === '')) {
            [bill] = await conn.query(`SELECT * FROM bills`);

            return res.json({ bill, message: 'use in stat' })
        }

        if (id === null || id === undefined || id === 'null' || id === '') {
            id = req.user.room
        }

        [bill] = await conn.query(`SELECT * FROM bills WHERE room_num = ?`, [id]);

        if (bill.length === 0) {
            return res.status(404).json({ message: 'No bill found for this room' });
        }

        res.json(bill);
    } catch (error) {
        console.error('Error fetching bill:', error.message);
        res.status(500).json({ error: 'Error fetching bill' });
    }
});


app.get(`/getBillDetails/:id?`, authenticateToken, authorizeBillDetailsAccess, async (req, res) => {
    try {
        let id = req.params.id;

        if (id === null || id === undefined || id === 'null') {
            id = req.user.room
            const [defaults] = await conn.query(
                `SELECT bill_id FROM bills 
                WHERE room_num = ? 
                LIMIT 1`,
                [id]
            );
            id = defaults[0].bill_id

        }

        const [results] = await conn.query('SELECT b.*,u.firstname FROM bills b JOIN users_rooms ur ON b.room_num = ur.room_num JOIN users u ON u.user_id = ur.user_id WHERE bill_id = ?', [id]);

        if (results.length === 0) {
            // ส่งสถานะ 404 ถ้าหากไม่พบข้อมูล
            throw { statusCode: 404, message: 'Bill not found' };
        }

        // ส่งข้อมูลบิลในรูปแบบ JSON
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching bill details:', error.message);
        // ส่งสถานะที่เหมาะสมและข้อความข้อผิดพลาด
        res.status(error.statusCode || 500).json({ error: error.message || 'Error fetching bill details' });
    }
});



app.get('/billing', async (req, res) => {
    try {
        const [billData] = await conn.query('SELECT * FROM rooms');
        console.log(billData)
        let electric = billData[0].cur_elec_am - billData[0].pre_elec_am
        let water = billData[0].cur_water_am - billData[0].pre_water_am
        console.log(electric, water)
        let type = billData[0].room_type
        let amount = 0

        if (type = "big") {
            amount += 3200
        }
        else if (type = "small") {
            amount += 2800
        }

        amount += electric * 8
        amount += water * 35

        let result = {
            room_num: billData[0].room_num,
            amount,
            pre_elec_am: billData[0].pre_elec_am,
            cur_elec_am: billData[0].cur_elec_am,
            pre_water_am: billData[0].pre_water_am,
            cur_water_am: billData[0].cur_water_am,
        }

        res.json(result);
        console.log(result)
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Error fetching users' });
    }
})

app.post('/billing', async (req, res) => {
    try {
        let { room_num, amount, pre_elect, cur_elect, pre_water, cur_water, name } = req.body;

        const [results] = await conn.query(`INSERT INTO bill SET room_num = ?, amount = ?, pre_elect = ?, cur_elect = ?, pre_water = ?, cur_water = ?, name = ?`,
            [room_num, amount, pre_elect, cur_elect, pre_water, cur_water, name]);
        res.json({
            message: 'Insert ok',
            data: results
        });
    } catch (error) {
        console.error('Error inserting user:', error.message);
        res.status(500).json({
            message: error.message || 'Something went wrong',
            errors: error.errors || []
        });
    }
});


app.get('/emails', async (req, res) => {
    const accessToken = req.headers.authorization.split(' ')[1];
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
        const response = await gmail.users.messages.list({ userId: 'me' });
        const messages = response.data.messages;

        const emailDetails = await Promise.all(messages.map(async (message) => {
            const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
            const fromHeader = getHeader(msg.data.payload.headers, 'From');
            const subjectHeader = getHeader(msg.data.payload.headers, 'Subject');
            const dateHeader = getHeader(msg.data.payload.headers, 'Date');
            const id = msg.data.id;
            const snippet = msg.data.snippet;
            return { from: fromHeader, subject: subjectHeader, date: dateHeader, snippet: snippet, id: id };
        }));

        res.json(emailDetails);
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).send('Error fetching emails');
    }
});

// Helper function to get the email header
function getHeader(headers, name) {
    const header = headers.find(header => header.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : 'No header found';
}

app.post('/check-email', async (req, res) => {
    const { emailId, amount, bill_id } = req.body;

    try {
        // ตรวจสอบว่าอีเมลนี้เคยตรวจสอบแล้วหรือไม่
        const [checkedRows] = await conn.query(
            `SELECT * FROM bills WHERE reference_id = ?`,
            [emailId]
        );

        if (checkedRows.length > 0) {
            return res.json({ match: false, message: 'Email already checked' });
        }

        // ค้นหาในฐานข้อมูลตาม Amount, id และตรวจสอบสถานะว่าเป็น 'Pending'
        const tolerance = 0.01;


        const [rows] = await conn.query(
            `SELECT * FROM bills WHERE ABS(total_amount - ?) <= ? AND bill_id = ? AND status = 'pending'`,
            [amount, tolerance, bill_id]
        );

        if (rows.length > 0) {
            try {
                const [results] = await conn.query(
                    `UPDATE bills SET status = 'success', reference_id = ? WHERE bill_id = ?`,
                    [emailId, rows[0].bill_id]
                );
            } catch (error) {
                console.error('Error executing query:', error);
            }

            res.json({ match: true, message: 'Status updated successfully' });
        } else {
            res.json({ match: false, message: 'No matching record found or already confirmed' });
        }
    } catch (error) {
        console.error('Error checking email data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get(`/get_rooms_for_admin`, async (req, res) => {
    const [results] = await conn.query(`
        SELECT 
            u.user_id, 
            u.firstname, 
            u.lastname, 
            r.room_num 
        FROM 
            users u 
        LEFT JOIN 
            users_rooms ur ON u.user_id = ur.user_id 
        LEFT JOIN 
            rooms r ON ur.room_num = r.room_num;
`)

    res.json(results);
})

app.get(`/get_users_for_admin`, async (req, res) => {
    const [results] = await conn.query(`
        SELECT 
            r.room_num, 
            GROUP_CONCAT(ur.user_id SEPARATOR ', ') AS user_ids, 
            GROUP_CONCAT(CONCAT(u.firstname, ' ', u.lastname) SEPARATOR ', ') AS fullnames 
        FROM 
            rooms r 
        LEFT JOIN 
            users_rooms ur ON ur.room_num = r.room_num 
        LEFT JOIN 
            users u ON ur.user_id = u.user_id 
        GROUP BY 
            r.room_num;
`)

    res.json(results);
})

app.post('/add_user_to_room', async (req, res) => {
    const { user_id, room_num } = req.body;

    try {
        // เรียกใช้ Stored Procedure
        const [result] = await conn.query(`CALL addUserToRoom(?, ?);`, [user_id, room_num]);

        // ส่งผลลัพธ์กลับไปยัง client
        res.status(200).json({ message: 'User added successfully.' });
    } catch (error) {
        console.error('Error inserting user:', error.message);

        // ส่งข้อผิดพลาดกลับไปยัง client
        res.status(500).json({
            message: error.message || 'Something went wrong'
        });
    }
});


app.get(`/get_rooms/:id?`, authenticateToken, async (req, res) => {
    try {
        const room = req.user.room
        let id = req.params.id;

        if (id === null || id === undefined || id === 'null') {
            const [results] = await conn.query(`SELECT * FROM users_rooms ur JOIN users u ON u.user_id = ur.user_id WHERE room_num = ?`, [room]);
            return res.json(results);
        }

        const [results] = await conn.query(`SELECT * FROM users_rooms ur JOIN users u ON u.user_id = ur.user_id WHERE room_num = ?`, [id]);
        res.json(results);


    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Error fetching users' });
    }
});



// CRUD Operations for Users
app.get('/users', authenticateToken, async (req, res) => {
    const id = req.user.id
    try {
        const [results] = await conn.query(`SELECT * FROM users WHERE user_id = ?`, [id]);
        res.json({results, role: req.user.role});
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.get(`/users/:id?`, async (req, res) => {
    try {
        const id = req.params.id;
        const [results] = await conn.query('SELECT * FROM users WHERE user_id = ?', [id]);
        if (results.length === 0) {
            throw { statusCode: 404, message: 'Not found' };
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(error.statusCode || 500).json({ error: 'Error fetching user' });
    }
});


app.post('/register', async (req, res) => {
    try {
        let { firstname, lastname, nickname, gender, address, email, password, dob, tel, image } = req.body;

        const passwordHash = await bcrypt.hash(password, 10);

        const user = {
            firstname,
            lastname,
            nickname,
            birthdate: dob,
            gender,
            address,
            email,
            password: passwordHash,
            tel,
            image
        };

        const [results] = await conn.query('INSERT INTO users SET ?', [user]);
        res.json({
            message: 'Insert ok',
            data: results
        });
    } catch (error) {
        console.error('Error inserting user:', error.message);
        res.status(500).json({
            message: error.message || 'Something went wrong',
            errors: error.errors || []
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [result] = await conn.query('SELECT * FROM users WHERE email = ?', [email])

        if (result.length === 0) {
            return res.status(400).json({
                message: 'Login Fail',
                errors: ['อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง']
            });
        }

        const userData = result[0]
        const id = userData.user_id

        const match = await bcrypt.compare(password, userData.password)
        if (!match) {
            return res.status(400).json({
                message: 'Login Fail',
                errors: ['อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง']
            })

        }

        const token = jwt.sign({ email, id }, SECRET, { expiresIn: '1h' })

        res.json({
            message: 'Login Success',
            token
        })

        const test = jwt.verify(token, SECRET)
        console.log('test', test)

    } catch (error) {
        console.error('Cannot LogingIn:', error.message);
        res.status(401).json({
            message: error.message || 'Login Fail',
            errors: error.errors || []
        });
    }
})


app.put('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updateUser = req.body;
        const [results] = await conn.query('UPDATE users SET ? WHERE id = ?', [updateUser, id]);
        res.json({
            message: 'Update ok',
            updateID: id,
            data: results
        });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
});

app.delete('/delete_user/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;

    try {
        const [result] = await conn.query('DELETE FROM users WHERE user_id = ?', [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ต้องการลบ' });
        }

        res.status(200).json({ message: 'ผู้ใช้ถูกลบเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
    }
});


app.delete('/delete_user_from_room/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;

    try {
        const [result] = await conn.query('DELETE FROM users_rooms WHERE user_id = ?', [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ที่ต้องการลบ' });
        }

        res.status(200).json({ message: 'ผู้ใช้ถูกลบเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
    }
});


app.post('/generateQR', async (req, res) => {
    // ดึงค่าจาก body ของคำขอ
    const billId = req.body.bill_id; // ดึง bill_id จาก body ของคำขอ

    try {
        const id = billId
        const [results] = await conn.query('SELECT total_amount FROM bills WHERE bill_id = ?', [id]);
        if (results.length === 0) {
            throw { statusCode: 404, message: 'Not found' };
        }
        let amount = parseFloat(results[0].total_amount);

        const mobileNumber = '0637744433'; // หมายเลขโทรศัพท์ที่ใช้ใน QR Code
        const payload = generatePayload(mobileNumber, { amount });
        const option = {
            color: {
                dark: '#000',
                light: '#fff'
            }
        };

        QRCode.toDataURL(payload, option, (err, url) => {
            if (err) {
                console.log("generate fail");
                return res.status(400).json({
                    RespCode: 400,
                    RespMessage: 'bad : ' + err
                });
            } else {
                pendingQRRequests.push({ billId, url });
                return res.status(200).json({
                    RespCode: 200,
                    RespMessage: 'good',
                    Result: url
                });
            }
        });
    } catch (error) {
        console.error('Error fetching :', error.message);
        res.status(error.statusCode || 500).json({ error: 'Error fetching user' });
    }
});

app.post(`/cancelQueue`, (req, res) => {
    const { bill_id } = req.body;
    const index = pendingQRRequests.findIndex(request => request.bill_id === bill_id);
    if (index !== -1) {
        pendingQRRequests.splice(index, 1);
        console.log(`Index ${index} cancelled successfully`)
        res.status(200).json({ message: 'Queue cancelled successfully' });
    } else {
        res.status(404).json({ message: 'Queue not found' });
    }
});

app.post('/admin-res', (req, res) => {
    let id = req.body.bill_id
    pendingAdminResponse.push({
        message: 'ทำรายการสำเร็จแล้ว',
        bill_id: id
    })
})


app.get('/wait-admin', (req, res) => {
    if (pendingAdminResponse.length > 0) {
        res.json(pendingAdminResponse.shift());
    } else {
        setTimeout(() => {
            res.json(pendingAdminResponse.shift() || {});
        }, 1000); // Polling interval
    }
});

app.get('/poll', (req, res) => {
    if (pendingQRRequests.length > 0) {
        res.json(pendingQRRequests.shift());
    } else {
        setTimeout(() => {
            res.json(pendingQRRequests.shift() || {});
        }, 1000); // Polling interval
    }
});

// Endpoint สำหรับตรวจสอบสลิป
app.post('/slip-check/:id', authenticateToken, upload.single('files'), async (req, res) => {
    let id = req.params.id
    const room = req.user.room

    const file = req.file;

    console.log(id)

    const [rows] = await conn.query(
        `SELECT * FROM bills WHERE bill_id = ? AND status = 'pending'`,
        [id]
    );

    if (!rows.length > 0) {
        return res.json({ message: "fail" })
    }

    // ตรวจสอบว่าได้รับข้อมูลแบบใดบ้าง
    if (!file) {
        return res.status(400).json({ error: 'Either data, file, or url must be provided.' });
    }

    // สร้าง formData สำหรับส่งคำขอไปยัง API ภายนอก
    const formData = new FormData();


    if (file) {
        formData.append('files', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });


        // ตั้ง log ให้เป็น true เสมอ
        formData.append('log', 'true');

        try {
            // ส่งคำขอไปยัง API ภายนอกด้วย axios
            const response = await axios.post('https://api.slipok.com/api/line/apikey/25333', formData, {
                headers: {
                    'x-authorization': 'SLIPOKKJCXJTN',
                    ...formData.getHeaders(), // ใช้เพื่อให้ Axios ตั้งค่า header สำหรับ multipart/form-data ได้ถูกต้อง
                },
            });

            const [results] = await conn.query(
                `UPDATE bills SET status = 'success', reference_id = ? WHERE bill_id = ?`,
                [response.data.data.transRef, rows[0].bill_id]
            )

            res.status(response.status).json({
                message: "success",
                detail: response.data.request
            });
        } catch (error) {
            console.error('Error sending request to external API:', error.response.data.message);
            res.status(error.response ? error.response.status : 500).json(error.response.data.message);
        }
    }
});

// Start the server
app.listen(PORT, async () => {
    await initMysql();
    console.log(`Server is running on http://localhost:${PORT}`);
});
