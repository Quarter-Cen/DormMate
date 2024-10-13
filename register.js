const BASE_URL = 'http://localhost:8000';


document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form-container');
    const submitBtn = document.querySelector('.submit-btn');
    const fileInput = document.getElementById('fileInput');
    const imageBox = document.getElementById('imageBox');

    let formData = {
        firstname: '',
        lastname: '',
        nickname: '',
        gender: '',
        address: '',
        email: '',
        password: '',
        tel: '',
        dob: '',
        image: '' // รูปภาพที่แปลงเป็น Base64
    };

    let isImageValid = false; // ตัวแปรสำหรับตรวจสอบว่าเป็นรูปหรือไม่

    function validateForm() {
        let errors = [];

        if (!formData.firstname) errors.push('กรุณากรอกชื่อ');
        if (!formData.lastname) errors.push('กรุณากรอกนามสกุล');
        if (!formData.nickname) errors.push('กรุณากรอกชื่อเล่น');
        if (!formData.gender) errors.push('กรุณาเลือกเพศ');
        if (!formData.address) errors.push('กรุณากรอกที่อยู่');
        if (!formData.email || !validateEmail(formData.email)) errors.push('กรุณากรอกอีเมลที่ถูกต้อง');
        if (!formData.password || formData.password.length < 6) errors.push('กรุณากรอกรหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร');
        if (!formData.tel) errors.push('กรุณากรอกเบอร์โทรศัพท์');
        if (!formData.dob) errors.push('กรุณาเลือกวันเกิด');
        if (!isImageValid) errors.push('กรุณาอัปโหลดรูปภาพที่ถูกต้อง');

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return false;
        }

        return true;
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // Event listener for image upload
    imageBox.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            // ตรวจสอบว่าเป็นรูปภาพหรือไม่ (MIME type)
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (validImageTypes.includes(file.type)) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = function () {
                    formData.image = reader.result;
                    imageBox.innerHTML = '<img src="' + reader.result + '" alt="Uploaded Image" style="width: 100%; height: 100%; object-fit: cover;">';
                }
                isImageValid = true;
            } else {
                alert('กรุณาอัปโหลดไฟล์รูปภาพ (jpeg, png, gif เท่านั้น)');
                isImageValid = false;
                imageBox.innerHTML = '+';
                fileInput.value = ''; // รีเซ็ตไฟล์ที่เลือก
            }
        }
    });

    // Gather form data and validate
    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // ป้องกันการ submit ฟอร์มแบบธรรมดา

        // Gather data from form
        formData.firstname = document.getElementById('firstname').value;
        formData.lastname = document.getElementById('lastname').value;
        formData.nickname = document.getElementById('nickname').value;
        formData.gender = document.getElementById('gender').value;
        formData.address = document.getElementById('address').value;
        formData.email = document.getElementById('email').value;
        formData.password = document.getElementById('password').value;
        formData.tel = document.getElementById('tel').value;
        formData.dob = document.getElementById('dob').value;

        // Validate form data
        if (validateForm()) {
            try {
                const response = await axios.post(`${BASE_URL}/register`, formData);
                console.log('Success:', response.message);
                alert('ข้อมูลถูกส่งไปยังเซิร์ฟเวอร์เรียบร้อยแล้ว');
                window.location.replace(`./login.html`)
            } catch (error) {
                console.error('Error:', error);
                alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
            }
        }
    });
});

const linkToSignIn = () => {
    window.location.replace(`./login.html`)
}
