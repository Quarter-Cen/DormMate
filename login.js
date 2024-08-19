const BASE_URL = 'http://localhost:8000'



const login =  async () => {
    let emailDOM = document.querySelector('input[name=email]')
    let passwordDOM = document.querySelector('input[name=password]')

    let messageDom = document.getElementById('message')
    const vaildateData = (userData) => {
        let errors = []
        if (!userData.email) {
          errors.push('กรุณาใส่อีเมล์')
        }
        if (!userData.password) {
          errors.push('กรุณาใส่รหัสผ่าน')
        }
        return errors
      }
    try{
    let loginData = {
      email: emailDOM.value,
      password: passwordDOM.value
    }
    const errors = vaildateData(loginData)
    if (errors.length > 0){
      throw {
        message: 'กรอกข้อมูลไม่ครบ',
        errors: errors
      }
    }
    
    let message = 'เข้าสู่ระบบสำเร็จ'
    const response = await axios.post(`${BASE_URL}/login`, loginData)
    console.log('response', response.data.message)

    sessionStorage.setItem('token', response.data.token)
      messageDom.innerText = message
      messageDom.className = 'message success'

    }catch (error) {
      console.log('error message', error.message)
      console.log('error', error.errors)
      if (error.response) {
        console.log(error.response)
        error.message = error.response.data.message
        error.errors = error.response.data.errors
      }

      let htmlData = '<div>'
      htmlData += `<div>${error.message}</div>`
      htmlData += '<ul>'
      for (let i = 0; i < error.errors.length; i++){
        htmlData += `<li>${error.errors[i]}</li>`
      }
      htmlData += '</ul>'
      htmlData += '</div>'

      messageDom.innerHTML = htmlData

      messageDom.className = 'message danger'
    }
  }