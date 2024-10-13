const BASE_URL = 'http://localhost:8000';

const urlParams = new URLSearchParams(window.location.search);
const billId = urlParams.get('bill_id');

// ทำการลบคิวเมื่อผู้ใช้ออกจากหน้า
window.addEventListener('beforeunload', async () => {
    console.log("delete queue")

    try {
        const response = await axios.post(`${BASE_URL}/cancelQueue`, {
            billId
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(response.message)
    } catch (error) {
        console.log(error.message)
    }

})
window.onload = async () => {
    const authToken = sessionStorage.getItem('token');


    if (!authToken) {
        console.error('Token not found in sessionStorage');
        window.location.href = `${BASE_URL}/login.html`;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('bill_id');

    try {
        const userResponse = await axios.get(`${BASE_URL}/users`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

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
        console.log(content)
        const response = await axios.get(`${BASE_URL}/getBillDetails/${billId}`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

        const bill = response.data;

        const textarea = document.querySelector('#detail');
        const totalAmountElement = document.querySelector('#total_amount');
        const electricTotal = ((bill.last_elec - bill.previous_elec) * 8).toFixed(2);
        const waterTotal = ((bill.last_water - bill.previous_water) * 10).toFixed(2);
        let roomPrice = 0;
        if (bill.type === 'big') {
            roomPrice += 3200.00;
        } else {
            roomPrice += 2800.00;
        }
        roomPrice = (roomPrice).toFixed(2)
        textarea.value = `${roomPrice}\n${electricTotal}\n${waterTotal}`;
        totalAmountElement.textContent = `${bill.total_amount} บาท`;
        content.style.display = 'block';

    } catch (error) {
        console.error('Error:', error.response?.data?.message || error.message);

        // ตรวจสอบประเภทของข้อผิดพลาด
        if (error.response?.data?.message === 'Invalid or expired token') {
            sessionStorage.removeItem('token');
            window.location.href = `${BASE_URL}/login.html`;
        } else if (error.response?.data?.message === 'Access denied') {
            window.location.replace(`http://localhost:8000/payment/?id=${error.response.data.UID}`);
        } else {
            alert(error.response.data.message)
            document.body.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            window.location.replace(`http://localhost:8000/payment/?id=${error.response.data.UID}`);
        }
    }
};

const button = document.getElementById('hideButton');
    const disableHover = document.getElementById('disableHover');

    function nevigator() {
        disableHover.classList.add('hidden'); // เพิ่มคลาสเพื่อทำให้ค่อยๆ หายไป
    }

    function nevigator2() {
        disableHover.classList.remove('hidden'); // เอาคลาสออกเพื่อทำให้ค่อยๆ แสดงกลับ
    }

    button.addEventListener('mouseover', nevigator);
    button.addEventListener('mouseout', nevigator2);


// ใช้ mouseover เพื่อตั้งค่าให้ฟังก์ชันทำงานเมื่อเมาส์อยู่เหนือปุ่ม
button.addEventListener('mouseover', nevigator);
button.addEventListener('mouseout', nevigator2);
function genQR() {
    // ดึงค่า bill_id จาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('bill_id');

    console.log(billId);
    // ใช้ billId ในคำขอ POST
    $.ajax({
        method: 'POST',
        url: 'http://localhost:8000/generateQR',
        contentType: 'application/json', // กำหนด Content-Type เป็น JSON
        data: JSON.stringify({
            bill_id: billId
        }),
        success: function(response) {
            console.log('good', response);
            $("#imgQR").attr('src', response.Result);
            startCountdown()
            pollForAdminRes()
        },
        error: function(err) {
            console.log('bad', err);
        }
    });
}

let countdownInterval;

function startCountdown() {
    let remainingTime = 180;

    const updateTimer = () => {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      QrButton.style.display = 'none'
      timerElement.textContent = `เวลาที่เหลือ : ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timerElement.style.display = 'block'
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
      } else {
        remainingTime--;
      }
    };

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }




async function pollForAdminRes() {
    try {
        const response = await fetch('http://localhost:8000/wait-admin');
        const data = await response.json();
        if (data.message) {
            alert(data.message);
            window.location.href = `http://localhost:8000/payment/detail.html?id=${data.bill_id}`
            return
        }
   
        // ทำการ polling ต่อไป
        setTimeout(pollForAdminRes, 1000); // Polling interval
    } catch (error) {
        console.error('Polling error:', error);
        setTimeout(pollForAdminRes, 5000); // Retry after 5 seconds
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
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // บังคับให้โหลดหน้าใหม่เพื่อไม่ให้ใช้แคช
        window.location.reload();
    }
});

const linkToTFB = () => {
    window.location.replace(`../TransferByBanking/index.html?bill_id=${billId}`)
}

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // ถ้าเกิดจากการใช้ Go Back หรือ Go Forward
        window.location.reload(); // Refresh หน้าทันที
    }
});