const BASE_URL = 'http://localhost:8000';




window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('bill_id');


    const response = await axios.get(`${BASE_URL}/getBillDetails/${billId}`);
    const bill = response.data;

    const textarea = document.querySelector('#detail');
    const totalAmountElement = document.querySelector('#total_amount');
    const electricTotal = (bill.cur_elect - bill.pre_elect) * 8;
    const waterTotal = (bill.cur_water - bill.pre_water) * 35;
    let roomPrice = 0
        if (bill.room_type == 'big'){
            roomPrice += 3200
        }else{
            roomPrice += 2800
        }

        textarea.value = `${roomPrice}\n${electricTotal}\n${waterTotal}`;
        totalAmountElement.textContent = `${bill.amount} บาท`;

}

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


// ทำการลบคิวเมื่อผู้ใช้ออกจากหน้า
window.addEventListener('beforeunload', () => {
    if (pollInterval) {
        clearTimeout(pollInterval);
    }
    $.ajax({
        method: 'POST',
        url: `${BASE_URL}/cancelQueue`,
        contentType: 'application/json',
        data: JSON.stringify({
            bill_id: new URLSearchParams(window.location.search).get('bill_id')
        }),
        success: function() {
            console.log('Queue cancelled');
        },
        error: function(err) {
            console.log('Error cancelling queue:', err);
        }
    });
});