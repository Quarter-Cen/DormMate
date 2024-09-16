// script.js
const BASE_URL = 'http://localhost:8000';

window.onload = async () => {
    const authToken = sessionStorage.getItem('token');

     if (!authToken) {
        console.error('Token not found in sessionStorage');
        window.location.href = `${BASE_URL}/login.html`;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    try {
        const userResponse = await axios.get(`${BASE_URL}/users`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

        const content = document.querySelector('.box');

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

        const response = await axios.get(`${BASE_URL}/getBills/${id}`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

        const data = response.data;
        console.log(data)
        const newRoom_num = data[0].room_num;

        // อัปเดต URL ด้วย billId ใหม่
        const url = new URL(window.location.href);
        url.searchParams.set('id', newRoom_num);
        window.history.pushState({}, '', url);

        const tbody = document.querySelector("table tbody");
        tbody.innerHTML = ''; // Clear existing rows

        data.forEach(bill => {
            const row = document.createElement("tr");
            row.setAttribute('data-id', bill.bill_id);

            const receiptCell = document.createElement("td");
            receiptCell.textContent = bill.bill_id;
            row.appendChild(receiptCell);

            const roomCell = document.createElement("td");
            roomCell.textContent = bill.room_num;
            row.appendChild(roomCell);

            const amountCell = document.createElement("td");
            amountCell.textContent = `${bill.amount} บาท`;
            row.appendChild(amountCell);

            const statusCell = document.createElement("td");
            let status = 'NULL';
            if (bill.status === 'pending') {
                status = 'ยังไม่ชำระ';
                statusCell.style.color = 'red';
            } else if (bill.status === 'success') {
                status = 'ชำระแล้ว';
                statusCell.style.color = 'green';
            } else {
                status = 'ล้มเหลว';
                statusCell.style.color = 'gray';
            }
            statusCell.textContent = status;
            row.appendChild(statusCell);

            const updatedCell = document.createElement("td");
            let updateColor = 'gray';
            if (bill.update_at && bill.update_at.trim() !== '') {
                updateColor = 'black';
            }
            updatedCell.style.color = updateColor;
            updatedCell.textContent = bill.update_at ? bill.update_at : 'ไม่มี';
            row.appendChild(updatedCell);

            const referenceCell = document.createElement("td");
            let refColor = 'gray';
            if (bill.reference_id && bill.reference_id.trim() !== '') {
                refColor = 'black';
            }
            referenceCell.style.color = refColor;
            referenceCell.textContent = bill.reference_id ? bill.reference_id : 'ไม่มี';
            row.appendChild(referenceCell);

            tbody.appendChild(row);
        });

        document.querySelectorAll('table tbody tr').forEach(row => {
            row.addEventListener('click', function () {
                const billId = this.getAttribute('data-id');
                window.location.href = `detail.html?id=${billId}`;
            });
        });
        content.style.display = 'block';

    } catch (error) {
        console.error('Error:', error.response?.data?.message || error.message);

        if (error.response?.data?.message === 'Invalid or expired token') {
            sessionStorage.removeItem('token');
            window.location.href = `${BASE_URL}/login.html`;
        }

        if (error.response?.data?.message === 'Access denied') {
            window.location.replace(`http://localhost:8000/payment/?id=${error.response.data.UID}`);
        }

        document.body.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
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

// เพิ่มฟังก์ชันการค้นหา
document.addEventListener("DOMContentLoaded", function () {
    const searchBar = document.getElementById('searchBar');

    searchBar.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        filterRows(searchTerm);
    });

    function filterRows(searchTerm) {
        const rows = document.querySelectorAll('table tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let isVisible = false;

            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(searchTerm)) {
                    isVisible = true;
                }
            });

            row.style.display = isVisible ? '' : 'none';
        });
    }
});

document.getElementById('bill-details').addEventListener('scroll', function () {
    const circles = [
        document.getElementById('background-circle1'),
        document.getElementById('background-circle2'),
        document.getElementById('background-circle3'),
        document.getElementById('background-circle4')
    ];
    const scrollTop = this.scrollTop;
    const scrollLeft = this.scrollLeft;

    circles.forEach(circle => {
        circle.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    });
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // ถ้าเกิดจากการใช้ Go Back หรือ Go Forward
        window.location.reload(); // Refresh หน้าทันที
    }
});