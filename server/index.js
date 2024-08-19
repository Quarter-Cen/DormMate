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

// Constants
const PORT = 8000;
const CLIENT_ID = '206205769825-982qc9ql6h3dso6ik6csmttbrjfr61nu.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
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
        database: 'tutorial',
    });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    let authToken = ''
    if (authHeader) {
        authToken = authHeader.split(' ')[1]
    }

    if (authToken == null) {
        return res.status(401).json({ message: 'Token not found' });
    }

    jwt.verify(authToken, SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;

        const [result] = await conn.query(`SELECT * FROM user_rooms WHERE user_id = ?`, [req.user.id])
        req.user.room = result[0].room_id
        req.user.role = result[0].role

        next();
    });
};

const authorizeOwnData = (req, res, next) => {
    const userId = req.user.id; // ID ของผู้ใช้จาก token
    const resourceId = parseInt(req.params.id, 10); // ID ของข้อมูลที่ร้องขอจาก URL parameters
    const userRole = req.user.role;

    if (userRole === 'admin') {
        return next();
    }

    if (userId !== resourceId) {
        return res.status(403).json({
            message: 'Access denied',
            UID: userId
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
                `SELECT bill_id FROM bill 
                WHERE room_num = ? 
                LIMIT 1`,
                [roomId]
            );
            BillId = defaults[0].bill_id

        }

        const [rows] = await conn.query(
            `SELECT * FROM bill
             WHERE bill_id = ? AND room_num = ?`,
            [BillId, roomId]
        );

        if (rows.length === 0 || (userRole !== 'admin' && userRole !== 'user')) {
            return res.status(403).json({ 
                message: 'Access denied: You do not have access to this room',
                UID: req.user.id
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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/payment/detail', (req, res) => {
    // ตรวจสอบว่าเส้นทางของไฟล์ถูกต้อง
    res.sendFile(path.join(__dirname,'..', 'payment', 'detail.html'));
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


app.get(`/getBills/:id?`, authenticateToken, authorizeOwnData, async (req, res) => {
    try {
        let id = req.params.id;
        let bill = []
        if (id === null || id === undefined || id === 'null'|| id === '') {
            id = req.user.room

        }
        
        if (req.user.role === 'admin'){
            [bill] = await conn.query(`SELECT * FROM bill`);
        }else{
            [bill] = await conn.query(`SELECT * FROM bill WHERE room_num = ?`, [id]);
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


app.get(`/getBillDetails/:id?`, authenticateToken, authorizeBillDetailsAccess, async (req, res) => {
    try {
        let id = req.params.id;

        if (id === null || id === undefined || id === 'null') {
            id = req.user.room
            const [defaults] = await conn.query(
                `SELECT bill_id FROM bill 
                WHERE room_num = ? 
                LIMIT 1`,
                [id]
            );
            id = defaults[0].bill_id

        }

        const [results] = await conn.query('SELECT * FROM bill WHERE bill_id = ?', [id]);

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
        const response = await gmail.users.messages.list({ userId: 'me', labelIds: ['IMPORTANT'] });
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
            `SELECT * FROM bill WHERE reference_id = ?`,
            [emailId]
        );

        if (checkedRows.length > 0) {
            return res.json({ match: false, message: 'Email already checked' });
        }

        // ค้นหาในฐานข้อมูลตาม Amount, id และตรวจสอบสถานะว่าเป็น 'Pending'
        const tolerance = 0.01;


        const [rows] = await conn.query(
            `SELECT * FROM bill WHERE ABS(amount - ?) <= ? AND bill_id = ? AND status = 'pending'`,
            [amount, tolerance, bill_id]
        );

        if (rows.length > 0) {
            try {
                const [results] = await conn.query(
                    `UPDATE bill SET status = 'success', reference_id = ?, update_at = CURRENT_TIMESTAMP WHERE bill_id = ?`,
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


// CRUD Operations for Users
app.get('/users', authenticateToken, async (req, res) => {
    const id = req.user.id

    try {
        const [results] = await conn.query(`SELECT * FROM users WHERE id = ?`, [id]);
        res.json(results);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [results] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
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
        let { firstname, lastname, nickname, age, gender, address, email, password, confirmPassword, uniqueCode } = req.body;

        const passwordHash = await bcrypt.hash(password, 10);

        const errors = validateData({ firstname, lastname, nickname, age, gender, address, email, password, confirmPassword, uniqueCode });
        if (errors.length > 0) {
            throw {
                message: 'กรอกข้อมูลไม่ครบ',
                errors: errors
            };
        }

        const confirmPasswordErrors = confirmPassword !== password ? ['รหัสผ่านไม่ตรงกัน'] : [];
        if (confirmPasswordErrors.length > 0) {
            throw {
                message: 'ข้อมูลไม่ตรงกัน',
                errors: confirmPasswordErrors
            };
        }

        const isUniqueCodeErrors = uniqueCode !== 'test' ? ['ไม่พบรหัสเฉพาะ'] : []; // สมมติว่า IsUniqueCode เป็น async function ที่ตรวจสอบรหัสเฉพาะ
        if (isUniqueCodeErrors.length > 0) {
            throw {
                message: 'ไม่พบรหัสเฉพาะ',
                errors: isUniqueCodeErrors
            };
        }

        const user = {
            firstname,
            lastname,
            nickname,
            age,
            gender,
            address,
            email,
            password: passwordHash
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
        const [result] = await conn.query('SELECT * FROM users WHERE email = ?', email)

        if (result.length === 0) {
            return res.status(400).json({
                message: 'Login Fail',
                errors: ['Wrong Email, Password']
            });
        }

        const userData = result[0]
        const id = userData.id
        const match = await bcrypt.compare(password, userData.password)
        if (!match) {
            res.status(400).json({
                message: 'Login Fail',
                errors: ['Wrong Email, Password']
            })
            return false
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

app.delete('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [results] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({
            message: 'Delete ok',
            deleteID: id,
            data: results
        });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({
            message: 'Something went wrong'
        });
    }
});


app.post('/generateQR', async (req, res) => {
    // ดึงค่าจาก body ของคำขอ
    const billId = req.body.bill_id; // ดึง bill_id จาก body ของคำขอ

    try {
        const id = billId
        const [results] = await conn.query('SELECT amount FROM bill WHERE bill_id = ?', [id]);
        if (results.length === 0) {
            throw { statusCode: 404, message: 'Not found' };
        }
        let amount = parseFloat(results[0].amount);

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

app.post('/cancelQueue', (req, res) => {
    const { bill_id } = req.body;
    // ค้นหาและลบคิว QR ของผู้ใช้
    const index = pendingQRRequests.findIndex(request => request.bill_id === bill_id);
    if (index !== -1) {
        pendingQRRequests.splice(index, 1);
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


// Start the server
app.listen(PORT, async () => {
    await initMysql();
    console.log(`Server is running on http://localhost:${PORT}`);
});
