const BASE_URL = 'http://localhost:8000';

const urlParams = new URLSearchParams(window.location.search);
const billId = urlParams.get('bill_id');
const authToken = sessionStorage.getItem('token');

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
        content.style.display = 'block';

        const response = await axios.get(`${BASE_URL}/getBillDetails/${billId}`, {
            headers: {
                'authorization': `Bearer ${authToken}`
            }
        });

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

document.getElementById('imageUpload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgPreview = document.createElement('img');
            imgPreview.src = e.target.result;
            imgPreview.style.width = '300px'; // Adjust image size as needed
            imgPreview.style.height = 'auto';
            
            const previewContainer = document.getElementById('imagePreview');
            previewContainer.innerHTML = ''; // Clear previous preview if any
            previewContainer.appendChild(imgPreview); // Append the new image
        };

        const imageSend = document.getElementById('imageSend');
        imageSend.style.display = 'block'

        reader.readAsDataURL(file); // Convert the file to a data URL
    }
});

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


const sendSlip = async () => {
    const slipInput = document.getElementById('imageUpload'); // รับไฟล์จาก input
    const formData = new FormData();

    if (slipInput.files.length > 0) {
        formData.append('files', slipInput.files[0]); // เพิ่มไฟล์ไปใน FormData (ชื่อควรตรงกับ back-end)
        try {
            // แก้ไข URL ไม่ต้องใช้ ':'
            const response = await axios.post(`${BASE_URL}/slip-check/${billId}`, formData, {
                headers: {
                    'authorization': `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data', // axios จะตั้งค่าให้ แต่ระบุเพื่อความชัดเจน
                    
                },
            });

            if (response.data.message === "success") {
                alert('อัปโหลดสลิปสำเร็จ');
                window.location.replace = `http://localhost:8000/payment/detail.html?id=${billId}`
                console.log("finish")
            } else {
                alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + response.data.message);
            }
        } catch (error) {
            console.error('เกิดข้อผิดพลาด:', error.response?.data || error.message);
            alert('เกิดข้อผิดพลาด: ' + (error.response?.data || error.message));
        }
    } else {
        alert('กรุณาเลือกไฟล์');
    }
};


const linkToQR = () => {
    window.location.replace(`../Qrcode/index.html?bill_id=${billId}`)
}

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // ถ้าเกิดจากการใช้ Go Back หรือ Go Forward
        window.location.reload(); // Refresh หน้าทันที
    }
});