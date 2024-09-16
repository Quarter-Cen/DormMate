const BASE_URL = 'http://localhost:8000';

const toggle = () => {
  const inputElement = document.getElementById("password");
  if(inputElement.type == "text"){
    inputElement.type = "password";
  } else {
    inputElement.type = "text";
  }
  
}

const checkLoginStatus = () => {
  if (sessionStorage.getItem('token')) {
    window.location.href = '/payment';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // ฟังก์ชัน login ที่จะถูกเรียกเมื่อผู้ใช้กดปุ่มเข้าสู่ระบบ
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
        loginfailButtonContainer.style.display = 'none'
      } else {
        emailButtonContainer.style.display = 'none';
      }

      if (!userData.password) {
        errors.push('กรุณาใส่รหัสผ่าน');
        passwordButtonContainer.style.display = 'block';
        loginfailButtonContainer.style.display = 'none'
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
      console.log('response', response.data.message);

      sessionStorage.setItem('token', response.data.token);

      // ใช้ history.replaceState เพื่อแทนที่ประวัติการเข้าชม
      window.history.replaceState({}, '', '/payment');
      window.location.href = '/payment';

    } catch (error) {
      console.log('error message', error.message);
      if (error.response) {
        console.log(error.response.data.errors);
        if (error.response.data.errors == "อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง"){
          loginfailButtonContainer.innerText = "อีเมล์ หรือ รหัสผ่านไม่ถูกต้อง"
          loginfailButtonContainer.style.display = 'block'

        }
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
