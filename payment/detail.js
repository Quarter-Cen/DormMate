
const BASE_URL = 'http://localhost:8000';

window.onload = async () => {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) {
        console.error('Token not found in sessionStorage');
        window.location.href = `${BASE_URL}/login.html`;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('id');

    if (!billId) {
        console.error('ID parameter not found in URL');
        window.location.href = `detail.html?id=${billId}`;
        return;
    }
    
    try {

        const userResponse = await axios.get(`${BASE_URL}/users`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });
    
        const user = userResponse.data[0];
    
        // Update the navbar with user's full name
        const rightNav = document.querySelector('.right-nav');
        rightNav.innerHTML = `
        <div style="
            display: flex;
            align-items: center;
            padding: 10px 15px;
            margin-left: 10px;
            margin-right: 10px;
            background-color: #186a99;
            border-radius: 10px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            pointer-events: none;
        ">
            <span style="
                color: white;
                font-size: 18px;
                padding-left: 10px;
                padding-right: 10px;
                text-transform: capitalize;
            ">
                ${user.firstname} ${user.lastname}
            </span>
        </div>`;

        const content = document.querySelector('.box');


        const response = await axios.get(`${BASE_URL}/getBillDetails/${billId}`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

        const bill = response.data;

        const newBillId = bill.bill_id;

        // อัปเดต URL ด้วย billId ใหม่
        const url = new URL(window.location.href);
        url.searchParams.set('id', newBillId);

        // เพิ่ม URL ใหม่ในประวัติของเบราว์เซอร์
        window.history.pushState({}, '', url);

        // Calculate totals
        const electricTotal = (bill.cur_elect - bill.pre_elect) * 8;
        const waterTotal = (bill.cur_water - bill.pre_water) * 35;
        const roomPrice = bill.room_type === 'big' ? 3200 : 2800;

        // Determine status and colors
        const statusDetails = {
            'pending': { text: 'ยังไม่ชำระ', color: 'red' },
            'success': { text: 'ชำระแล้ว', color: 'green' },
            'failure': { text: 'ล้มเหลว', color: 'gray' }
        };

        const status = statusDetails[bill.status] || { text: 'NULL', color: 'black' };
        const refColor = bill.reference_id ? 'black' : 'gray';
        const updateColor = bill.update_at ? 'black' : 'gray';
        const createColor = bill.timestamp ? 'black' : 'gray';

        // Display bill details
        document.querySelector('.bill-details').innerHTML = `
            <h2>รหัสใบรับเงิน/ใบแจ้งหนี้: ${bill.bill_id}</h2>
            <p><strong>เลขที่ห้อง:</strong> ${bill.room_num}</p>
            <p><strong>ชื่อ:</strong> คุณ${bill.name}</p>
            <table>
                <thead>
                    <tr>
                        <th>รายการ</th>
                        <th>จดครั้งก่อน</th>
                        <th>จดครั้งนี้</th>
                        <th>หน่วยที่ใช้</th>
                        <th>ราคา/หน่วย</th>
                        <th>จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>ค่าเช่า</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td style="text-align: end;">${roomPrice}</td>
                    </tr>
                    <tr>
                        <td>ค่าไฟฟ้า</td>
                        <td style="text-align: center;">${bill.pre_elect}</td>
                        <td style="text-align: center;">${bill.cur_elect}</td>
                        <td style="text-align: end;">${bill.cur_elect - bill.pre_elect}</td>
                        <td style="text-align: end;">8</td>
                        <td style="text-align: end;">${electricTotal}</td>
                    </tr>
                    <tr>
                        <td>ค่าน้ำประปา</td>
                        <td style="text-align: center;">${bill.pre_water}</td>
                        <td style="text-align: center;">${bill.cur_water}</td>
                        <td style="text-align: end;">${bill.cur_water - bill.pre_water}</td>
                        <td style="text-align: end;">35</td>
                        <td style="text-align: end;">${waterTotal}</td>
                    </tr>
                    <tr class="total-amount-row">
                        <td colspan="5">รวมทั้งหมด</td>
                        <td style="text-align: end;">${bill.amount} บาท</td>
                    </tr>
                </tbody>
            </table>
            <p><strong>สถานะ:</strong> <span style="color: ${status.color};">${status.text}</span></p>
            <p><strong>สร้างเมื่อ:</strong> <span style="color: ${createColor};">${bill.timestamp || 'ไม่มี'}</span></p>
            <p><strong>อัปเดตเมื่อ:</strong> <span style="color: ${updateColor};">${bill.update_at || 'ไม่มี'}</span></p>
            <p><strong>รหัสอ้างอิง:</strong> <span style="color: ${refColor};">${bill.reference_id || 'ไม่มี'}</span></p>
            <div id="payment-button-container"></div>
        `;

        // Show payment button if status is 'pending'
        if (bill.status === 'pending') {
            const paymentButtonContainer = document.getElementById('payment-button-container');
            const paymentButton = document.createElement('button');
            paymentButton.innerText = 'ชำระเงิน';
            paymentButton.style.fontSize = '20px';
            paymentButton.style.backgroundColor = '#186a99';
            paymentButton.style.color = '#fff';
            paymentButton.style.padding = '15px 30px';
            paymentButton.style.border = 'none';
            paymentButton.style.borderRadius = '8px';
            paymentButton.style.cursor = 'pointer';
            paymentButton.style.width = '200px';
            paymentButton.style.height = '60px';

            paymentButton.addEventListener('click', () => {
                sessionStorage.setItem('canAccessPayment', 'true');
                window.location.href = `QrCode/index.html?bill_id=${billId}`;
            });

            paymentButtonContainer.appendChild(paymentButton);
        }
        content.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.bill-details').innerText = 'Error fetching bill details';
        if (error.response?.data?.message === 'Invalid or expired token') {
            window.location.href = `${BASE_URL}/login.html`;
        }
    }
};


document.addEventListener("DOMContentLoaded", function () {
    const overlay = document.getElementById('loading-overlay');
    const overlayVisibleKey = 'overlayVisible';

    // ฟังก์ชันในการซ่อน overlay
    function hideOverlay() {
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300); // ปรับค่าดีเลย์ตามต้องการ
    }

    // แสดง overlay หาก flag ใน sessionStorage ถูกตั้งค่าไว้
    if (sessionStorage.getItem(overlayVisibleKey) === 'true') {
        overlay.classList.remove('hidden');
    } else {
        hideOverlay();
    }

    // จัดการกับ event ก่อนการโหลดหน้าเว็บเพื่อให้ overlay ยังคงแสดงอยู่
    window.addEventListener('beforeunload', function () {
        sessionStorage.setItem(overlayVisibleKey, 'true');
    });

    // จัดการกับ event โหลดหน้าเว็บเพื่อซ่อน overlay และรีเซ็ต flag
    window.addEventListener('load', function () {
        hideOverlay();
        sessionStorage.removeItem(overlayVisibleKey);
    });
});
