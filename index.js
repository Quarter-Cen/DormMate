const BASE_URL = 'http://localhost:8000'

let mode = 'CREATE'
let selectedID = ''

window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get('id')
  if (id){
    mode = 'EDIT'
    selectedID = id

    try {
      const response = await axios.get(`${BASE_URL}/users/${id}`)
      const user = response.data

      let firstNameDOM = document.querySelector('input[name=firstname]')
      let lastNameDOM = document.querySelector('input[name=lastname]')
      let ageDOM = document.querySelector('input[name=age]')
      let emailDOM = document.querySelector('input[name=email]')
      let passwordDOM = document.querySelector('input[name=password]')

    
      let descriptionDOM = document.querySelector('textarea[name=description]')

      firstNameDOM.value = user.firstname
      lastNameDOM.value = user.lastname
      ageDOM.value = user.age
      descriptionDOM.value = user.description
      emailDOM.value = user.email
      passwordDOM.value = user.password

      let genderDOMs = document.querySelectorAll('input[name=gender]')
      let interestDOMs = document.querySelectorAll('input[name=interest]')

      for (let i = 0; i < genderDOMs.length; i++) {
        if (genderDOMs[i].value == user.gender) {
          genderDOMs[i].checked = true
        }
      }
       
      for (let i = 0; i < interestDOMs.length; i++) {
        if (user.interest.includes(interestDOMs[i].value)) {
          interestDOMs[i].checked = true
        }
      }


    } catch (error) {
      console.log('error', error)
    }
  }
}

const vaildateData = (userData) => {
  let errors = []

  if (!userData.firstname) {
    errors.push('กรุณาใส่ชื่อ')
  }
  if (!userData.lastname) {
    errors.push('กรุณาใส่นามสกุล')
  }
  if (!userData.age) {
    errors.push('กรุณาใส่อายุ')
  }
  if (!userData.gender) {
    errors.push('กรุณาเลือกเพศ')
  }
  if (!userData.interest) {
    errors.push('กรุณาเลือกความสนใจ')
  }
  if (!userData.description) {
    errors.push('กรุณาใส่คำอธิบาย')
  }
  if (!userData.email) {
    errors.push('กรุณาใส่อีเมล์')
  }
  if (!userData.password) {
    errors.push('กรุณาใส่รหัสผ่าน')
  }
  return errors
}


const createBills = async() => {

  let uid = 1;
  let name = "กนก แสงจันทร์";
  let billData = await axios.get(`${BASE_URL}/billing`)
  console.log('Bill Data', billData.data)

  let bill = {
    room_num : uid,
    amount : billData.data.amount,
    pre_elect : billData.data.pre_elec_am,
    cur_elect : billData.data.cur_elec_am,
    pre_water : billData.data.pre_water_am,
    cur_water : billData.data.cur_water_am,
    name : name
  }
  
  const response = await axios.post(`${BASE_URL}/billing`, bill)
  console.log('response', response.data)
  

}

const submitData =  async () => {
    let firstNameDOM = document.querySelector('input[name=firstname]')
    let lastNameDOM = document.querySelector('input[name=lastname]')
    let ageDOM = document.querySelector('input[name=age]')
    let emailDOM = document.querySelector('input[name=email]')
    let passwordDOM = document.querySelector('input[name=password]')

    let genderDOM = document.querySelector('input[name=gender]:checked') || {}
    let interestDOMs = document.querySelectorAll('input[name=interest]:checked') || {}
  
    let descriptionDOM = document.querySelector('textarea[name=description]')

    let messageDom = document.getElementById('message')

    try{
    let interest = ''
  
    for (let i = 0; i < interestDOMs.length; i++) {
      interest += interestDOMs[i].value
      if (i != interestDOMs.length - 1) {
        interest += ', '
      }
    }
  
    let userData = {
      firstname: firstNameDOM.value,
      lastname: lastNameDOM.value,
      age: ageDOM.value,
      gender: genderDOM.value,
      description: descriptionDOM.value,
      interest: interest,
      email: emailDOM.value,
      password: passwordDOM.value
    }
    console.log('submit data', userData)

    const errors = vaildateData(userData)

    if (errors.length > 0){
      throw {
        message: 'กรอกข้อมูลไม่ครบ',
        errors: errors
      }
    }

    let message = 'บันทึกข้อมูลเรียบร้อย'

    if (mode == 'CREATE') {
      const response = await axios.post(`${BASE_URL}/users`, userData)
      console.log('response', response.data)
    } else {
      const response = await axios.put(`${BASE_URL}/users/${selectedID}`, userData)
      message = 'แก้ไขข้อมูลเรียบร้อย'
      console.log('response', response.data)
    }
      
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
