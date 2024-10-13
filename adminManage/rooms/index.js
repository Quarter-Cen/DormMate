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

        const response = await axios.get(`${BASE_URL}/get_users_for_admin`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

        const data = response.data.bill || response.data;
        console.log(data);


        const tbody = document.querySelector("table tbody");
        tbody.innerHTML = ''; // Clear existing rows

        data.forEach(bill => {
            const row = document.createElement("tr");
            row.setAttribute('data-id', bill.room_num);

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
            if (bill.user_ids) {
                userColor = 'black';
            }
            userCell.style.color = userColor;
            userCell.textContent = bill.user_ids ? bill.user_ids : 'ไม่มี';
            row.appendChild(userCell);

            const referenceCell = document.createElement("td");
            let refColor = 'gray';

            if (bill.fullnames) {
                refColor = 'black';
            }

            referenceCell.textContent = bill.fullnames ? bill.fullnames : 'ไม่มี';
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
                const userId = prompt('กรุณากรอก user_id ของผู้ใช้ที่ต้องการลบ:');
                if (userId){
                    const confirmation = confirm('คุณแน่ใจหรือว่าต้องการลบผู้ใช้?');
                    if (confirmation) {
                        try {
                            await axios.delete(`${BASE_URL}/delete_user_from_room/${userId}`, {
                                headers: {
                                    'authorization': `Bearer ${authToken}`
                                }
                            });
                            // ลบแถวจาก DOM
                            row.remove();
                            alert('ผู้ใช้ถูกลบเรียบร้อยแล้ว');
                            location.reload();
    
                        } catch (error) {
                            console.error('Error deleting user:', error);
                            alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
                        }
                    }}
                
            });

            deleteCell.appendChild(deleteButton);
            row.appendChild(deleteCell);

            const addCell = document.createElement("td");
            const addButton = document.createElement("button");
            addButton.textContent = "เพิ่ม";
            addButton.style.color = "green"; // เปลี่ยนสีข้อความของปุ่มเป็นเขียว

            // เพิ่ม event listener สำหรับปุ่มเพิ่ม
            addButton.addEventListener('click', async (e) => {
                e.stopPropagation(); // ป้องกันการคลิกที่แถว

                // ขอให้ผู้ใช้กรอก user_id และ room_num
                const userId = prompt('กรุณากรอก user_id ของผู้ใช้ที่ต้องการเพิ่ม:');
                const roomNum = bill.room_num; // ใช้ room_num จากข้อมูล bill

                if (userId) {
                    // ยืนยันการเพิ่มผู้ใช้
                    const confirmation = confirm('คุณแน่ใจหรือว่าต้องการเพิ่มผู้ใช้นี้?');
                    if (confirmation) {
                        try {
                            // เรียก API เพื่อเพิ่มผู้ใช้เข้าไปในห้อง
                            await axios.post(`${BASE_URL}/add_user_to_room`, {
                                user_id: userId,
                                room_num: roomNum
                            }, {
                                headers: {
                                    'authorization': `Bearer ${authToken}`
                                }
                            });

                            alert('ผู้ใช้ถูกเพิ่มเรียบร้อยแล้ว');
                            location.reload(); // รีเฟรชหน้าเพื่อดูข้อมูลล่าสุด

                        } catch (error) {
                            console.error('Error adding user:', error);
                            alert(error.response.data.message);
                        }
                    }
                }
            });

            addCell.appendChild(addButton);
            row.appendChild(addCell);


            tbody.appendChild(row);
        });

        document.querySelectorAll('table tbody tr').forEach(row => {
            row.addEventListener('click', function () {
                const billId = this.getAttribute('data-id');
                window.location.href = `http://localhost:8000/?id=${billId}`;
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

window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        // ถ้าเกิดจากการใช้ Go Back หรือ Go Forward
        window.location.reload(); // Refresh หน้าทันที
    }
});

function formatDateThai(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
    };

    // ใช้ Intl.DateTimeFormat เพื่อแสดงวันที่ไทย (พ.ศ.)
    return new Intl.DateTimeFormat('th-TH', options).format(date);
}