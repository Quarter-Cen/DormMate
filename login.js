const BASE_URL = 'http://localhost:8000';

const toggle = () => {
  const inputElement = document.getElementById("password");
  const eye = document.getElementById("eye-image");

  if (inputElement.type === "text") {
    inputElement.type = "password";
    eye.src = "./img/eye-slash-alt-svgrepo-com.svg";  // เปลี่ยนเป็นรูปตาที่แสดงปิดรหัสผ่าน
  } else {
    inputElement.type = "text";
    eye.src = "./img/eye-alt-svgrepo-com.svg";  // เปลี่ยนเป็นรูปตาที่แสดงรหัสผ่าน
  }
};


const checkLoginStatus = () => {
  if (sessionStorage.getItem('token')) {
    window.location.href = '/';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const login = async () => {
    let emailDOM = document.querySelector('input[name=email]');
    let passwordDOM = document.querySelector('input[name=password]');
    const emailButtonContainer = document.getElementById('email-error-button-container');
    const passwordButtonContainer = document.getElementById('password-error-button-container');
    const loginfailButtonContainer = document.getElementById('login-fail-button-container');

    const validateData = (userData) => {
      let errors = [];
      if (!userData.email) {
        errors.push('กรุณาใส่อีเมล์');
        emailButtonContainer.style.display = 'block';
        loginfailButtonContainer.style.display = 'none';
      } else {
        emailButtonContainer.style.display = 'none';
      }

      if (!userData.password) {
        errors.push('กรุณาใส่รหัสผ่าน');
        passwordButtonContainer.style.display = 'block';
        loginfailButtonContainer.style.display = 'none';
      } else {
        passwordButtonContainer.style.display = 'none';
      }

      return errors;
    };

    try {
      let loginData = {
        email: emailDOM.value.trim(),
        password: passwordDOM.value.trim()
      };

      const errors = validateData(loginData);
      if (errors.length > 0) {
        throw {
          message: 'กรอกข้อมูลไม่ครบ',
          errors: errors
        };
      }

      const response = await axios.post(`${BASE_URL}/login`, loginData);

      // ตรวจสอบการตอบกลับจาก server ว่ามี token จริงหรือไม่
      if (response.data.token) {
        sessionStorage.setItem('token', response.data.token);

        // // ใช้ history.replaceState เพื่อแทนที่ประวัติการเข้าชม
        window.history.replaceState({}, '', '/');
        window.location.href = '/';
      } else {
        throw new Error('Token not received from server');
      }

    } catch (error) {
      if (error.response) {
        console.log(error.response.data.errors);
        if (error.response.data.errors.includes("อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง")) {
          loginfailButtonContainer.innerText = "อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง";
          loginfailButtonContainer.style.display = 'block';
        }
      } else {
        console.error('Error:', error.message);
      }
    }
  };

  // เชื่อมโยงฟังก์ชัน login กับเหตุการณ์คลิกของปุ่มเข้าสู่ระบบ
  const loginBtn = document.querySelector('button[name=login]');
  loginBtn.addEventListener('click', login);

  // จัดการกับปัญหาการย้อนกลับของเบราว์เซอร์
  window.onpopstate = function(event) {
    if (sessionStorage.getItem('token')) {
      window.location.href = '/payment'; // หรือหน้าอื่นที่ต้องการ
    }
  };

  // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อโหลดหน้า
  checkLoginStatus();
});

const linkToSignUp = () => {
  window.location.replace(`./register.html`)
}