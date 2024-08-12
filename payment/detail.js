const BASE_URL = 'http://localhost:8000';

window.onload = async () => {
    // Get the bill ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('id');

    if (!billId) {
        document.querySelector('.bill-details').innerText = 'No Bill ID provided';
        return;
    }

    try {
        // Fetch bill details from the server
        const response = await axios.get(`${BASE_URL}/getBillDetails/${billId}`);
        const bill = response.data;

        // Calculate electric and water totals
        const electricTotal = (bill.cur_elect - bill.pre_elect) * 8;
        const waterTotal = (bill.cur_water - bill.pre_water) * 35;
        let roomPrice = 0
        if (bill.room_type == 'big'){
            roomPrice += 3200
        }else{
            roomPrice += 2800
        }

        let status = 'NULL';
        let statusColor = 'black'; // กำหนดสีเริ่มต้น
        let refColor = 'gray';
        let updateColor = 'gray';
        let createColor = 'gray';

        if (bill.status === 'pending') {
            status = 'ยังไม่ชำระ';
            statusColor = 'red'; // สีแดงสำหรับสถานะยังไม่ชำระ
        } else if (bill.status === 'success') {
            status = 'ชำระแล้ว';
            statusColor = 'green'; // สีเขียวสำหรับสถานะชำระแล้ว
        } else {
            status = 'ล้มเหลว';
            statusColor = 'gray'; // สีเทาสำหรับสถานะล้มเหลว
        }

        if (bill.reference_id && bill.reference_id.trim() !== '') {
            refColor = 'black'; // ถ้ามีข้อความใน reference_id ให้เป็นสีดำ
        }
        if (bill.update_at && bill.update_at.trim() !== '') {
            updateColor = 'black'; // ถ้ามีข้อความใน update_at ให้เป็นสีดำ
        }
        if (bill.timestamp && bill.timestamp.trim() !== '') {
            createColor = 'black'; // ถ้ามีข้อความใน timestamp ให้เป็นสีดำ
        }


        // Display bill details in a table
        const billDetailsDiv = document.querySelector('.bill-details');
        billDetailsDiv.innerHTML = `
            <h2>รหัสใบรับเงิน/ใบแจ้งหนี้: ${bill.bill_id}</h2>
            <p><strong>เลขที่ห้อง:</strong> ${bill.room_num}</p>
            <p><strong>ชื่่อ:</strong> คุณ${bill.name}</p>
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
            <p><strong>สถานะ:</strong> <span style="color: ${statusColor};">${status}</span></p>
            <p><strong>สร้างเมื่อ:</strong> <span style="color: ${createColor};">${bill.timestamp ? bill.timestamp : 'ไม่มี'}</span></p>
            <p><strong>อัปเดตเมื่อ:</strong> <span style="color: ${updateColor};">${bill.update_at ? bill.update_at : 'ไม่มี'}</span></p>
            <p><strong>รหัสอ้างอิง:</strong> <span style="color: ${refColor};">${bill.reference_id ? bill.reference_id : 'ไม่มี'}</span></p>
            <div id="payment-button-container"></div> <!-- Container สำหรับปุ่มชำระเงิน -->
        `;
         // แสดงปุ่มชำระเงินถ้าสถานะคือ 'ยังไม่ชำระ'
if (bill.status == 'pending') {
    const paymentButtonContainer = document.getElementById('payment-button-container');
    const paymentButton = document.createElement('button');
    paymentButton.innerText = 'ชำระเงิน';
    paymentButton.style.fontSize = '20px'; // เพิ่มขนาดฟอนต์
    paymentButton.style.backgroundColor = '#186a99';
    paymentButton.style.color = '#fff';
    paymentButton.style.padding = '15px 30px'; // เพิ่ม padding ให้ปุ่มใหญ่ขึ้น
    paymentButton.style.border = 'none';
    paymentButton.style.borderRadius = '8px'; // เพิ่มขนาด border-radius
    paymentButton.style.cursor = 'pointer';
    paymentButton.style.width = '200px'; // เพิ่มความกว้างของปุ่ม
    paymentButton.style.height = '60px'; // เพิ่มความสูงของปุ่ม
    
    // กำหนด event handler สำหรับการกดปุ่ม
    paymentButton.addEventListener('click', () => {
        // Redirect to payment page with bill ID
        window.location.href = `QrCode/index.html?bill_id=${billId}`;
    });
    
    paymentButtonContainer.appendChild(paymentButton);
}
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.bill-details').innerText = 'Error fetching bill details';
    }
};