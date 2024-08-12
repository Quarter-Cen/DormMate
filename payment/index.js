const BASE_URL = 'http://localhost:8000';

        window.onload = async () => {
            try {
                const response = await axios.get(`${BASE_URL}/getBills`); // ตรวจสอบ URL และพอร์ต
                const data = response.data;
                
                // ค้นหา tbody เพื่อเพิ่มแถวใหม่
                const tbody = document.querySelector("table tbody");

                // ลูปผ่านข้อมูลและเพิ่มแถวใหม่ในตาราง
                data.forEach(bill => {
                    const row = document.createElement("tr");
                    row.setAttribute('data-id', bill.bill_id); // เพิ่ม data-id ที่มีค่าเป็น bill_id

                    const receiptCell = document.createElement("td");
                    receiptCell.textContent = bill.bill_id;
                    row.appendChild(receiptCell);
                    
                    const roomCell = document.createElement("td");
                    roomCell.textContent = bill.room_num;
                    row.appendChild(roomCell);
                    
                    const amountCell = document.createElement("td");
                    amountCell.textContent = bill.amount + " บาท";
                    row.appendChild(amountCell);
                    
                    const statusCell = document.createElement("td");
                    let status = 'NULL'
                    if (bill.status == 'pending') {
                        status = 'ยังไม่ชำระ';
                        statusCell.style.color = 'red'; // ตั้งค่าสีแดง
                    } else if (bill.status == 'success') {
                        status = 'ชำระแล้ว';
                        statusCell.style.color = 'green'; // ตั้งค่าสีเขียว
                    } else {
                        status = 'ล้มเหลว';
                        statusCell.style.color = 'gray'; // ตั้งค่าสีเทา
                    }
                    statusCell.textContent = status;
                    row.appendChild(statusCell);
                    
                    const updatedCell = document.createElement("td");

                    let updateColor = 'gray';
                    if (bill.update_at && bill.update_at.trim() !== '') {
                        updateColor = 'black'; // ถ้ามีข้อความใน reference_id ให้เป็นสีดำ
                    }

                    updatedCell.style.color = updateColor
                    updatedCell.textContent = bill.update_at ? bill.update_at : 'ไม่มี';
                    row.appendChild(updatedCell);
                    
                    const referenceCell = document.createElement("td");
                    let refColor = 'gray'
                    if (bill.reference_id && bill.reference_id.trim() !== '') {
                        refColor = 'black'; // ถ้ามีข้อความใน reference_id ให้เป็นสีดำ
                    }
                    referenceCell.style.color = refColor
                    referenceCell.textContent = bill.reference_id ? bill.reference_id : 'ไม่มี';
                    row.appendChild(referenceCell);
                    
                    tbody.appendChild(row);
                });

                // เพิ่ม Event Listener ให้กับทุกแถว
                document.querySelectorAll('table tbody tr').forEach(row => {
                    row.addEventListener('click', function() {
                        const billId = this.getAttribute('data-id');
                        window.location.href = `detail.html?id=${billId}`;
                    });
                });
            } catch (error) {
                console.error('Error:', error);
            }
        };