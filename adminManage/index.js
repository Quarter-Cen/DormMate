// script.js
const BASE_URL = 'http://localhost:8000';

window.onload = async () => {
    const authToken = sessionStorage.getItem('token');

     if (!authToken) {
        alert('Token not found in sessionStorage');
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

        const user = userResponse.data.results[0];

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
            <span id="profile-icon" style="
                color: white;
                font-size: 18px;
                padding-left: 10px;
                padding-right: 10px;
                text-transform: capitalize;
            ">
                ${user.firstname} ${user.lastname}
            </span>
            <div class="dropdown-content" id="dropdown-menu">
        <a href="#">โปรไฟล์</a>
        <a href="#">จัดการบัญชี</a>
        <a href="#">Log out</a>
      </div>
        </div>`;

        const response = await axios.get(`${BASE_URL}/get_rooms_for_admin`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });
        
        const data = response.data.bill || response.data;
        console.log(data);
        const newRoom_num = data[0].room_num;
        
        const tbody = document.querySelector("table tbody");
        tbody.innerHTML = ''; // Clear existing rows
        
        data.forEach(bill => {
            const row = document.createElement("tr");
            row.setAttribute('data-id', bill.user_id);
        
            const roomCell = document.createElement("td");
            let roomColor = 'gray';
            if (bill.room_num) {
                roomColor = 'black';
            }
            roomCell.style.color = roomColor;
            roomCell.textContent = bill.room_num ? bill.room_num : 'ไม่มี';
            row.appendChild(roomCell);
        
            const userCell = document.createElement("td");
            let userColor = 'gray';
            if (bill.user_id) {
                userColor = 'black';
            }
            userCell.style.color = userColor;
            userCell.textContent = bill.user_id ? bill.user_id : 'ไม่มี';
            row.appendChild(userCell);
        
            const referenceCell = document.createElement("td");
            let refColor = 'gray';
            let fullname = bill.firstname + " " + bill.lastname;
        
            if (fullname) {
                refColor = 'black';
            }
        
            referenceCell.textContent = fullname ? fullname : 'ไม่มี';
        
            if (!bill.firstname || !bill.lastname){
                referenceCell.textContent = 'ไม่มี';
                refColor = 'gray';
            }
        
            referenceCell.style.color = refColor;
            row.appendChild(referenceCell);
        
            // สร้างเซลล์สำหรับปุ่มลบ
            const deleteCell = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "ลบ";
            deleteButton.style.color = "red"; // เปลี่ยนสีข้อความของปุ่มเป็นแดง
        
            // เพิ่ม event listener สำหรับปุ่มลบ
            deleteButton.addEventListener('click', async (e) => {
                e.stopPropagation(); // ป้องกันการคลิกที่แถว
                const confirmation = confirm('คุณแน่ใจหรือว่าต้องการลบผู้ใช้?');
                if (confirmation) {
                    try {
                        await axios.delete(`${BASE_URL}/delete_user/${bill.user_id}`, {
                            headers: {
                                'authorization': `Bearer ${authToken}`
                            }
                        });
                        // ลบแถวจาก DOM
                        row.remove();
                        alert('ผู้ใช้ถูกลบเรียบร้อยแล้ว');
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
                    }
                }
            });
        
            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);
        
            tbody.appendChild(row);
        });
        
        document.querySelectorAll('table tbody tr').forEach(row => {
            row.addEventListener('click', function () {
                const billId = this.getAttribute('data-id');
                window.location.href = `edit.html?id=${billId}`;
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
                window.location.replace(`http://localhost:8000/payment/?id=${error.response.data.room}`);
            }
        
            document.body.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        }
}

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