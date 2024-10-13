const BASE_URL = 'http://localhost:8000';


window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  let header = document.getElementById('bill-head');
  let sideBar = document.querySelector('.sidebar')

  try {
    const authToken = sessionStorage.getItem('token');
    if (!authToken) {
      console.error('Token not found in sessionStorage');
      window.location.href = `${BASE_URL}/login.html`;
      return;
    }


    const userResponse = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'authorization': `Bearer ${authToken}`
      }
    });

    const user = userResponse.data.results[0];
    if(userResponse.data.role === 'admin'){
      document.getElementById('adminOnly').style.display = 'block'
    }


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
  </div>`;
    try {
      const sidebarRes = await axios.get(`${BASE_URL}/get_rooms/${id}`, {
        headers: {
          'authorization': `Bearer ${authToken}`
        }
      });
      const rooms = sidebarRes.data; // Extract data from response

      const roomDetails = rooms.length > 0 ? rooms.map(room => {
        return `<div class="room-detail">
              <p>ผู้อยู่อาศัย: ${room.firstname} ${room.lastname}</p>
          </div>`;
      }).join('') : '<p>ไม่มีข้อมูล</p>'; // Handle no rooms

      sideBar.innerHTML = `<div>   
          <h2>รายละเอียดห้องพัก</h2>
          <p>เลขที่ห้อง: ${id !== null ? id : 'ทั้งหมด'}</p>
          ${id !== null ? roomDetails : ''}

          <a href="/payment"><button>ตรวจสอบบิล</button></a>
      </div>`;
    } catch (error) {
      console.error('Error fetching room details:', error);
      sideBar.innerHTML = `<div>   
          <h2>รายละเอียดห้องพัก</h2>
          <p>ไม่สามารถดึงข้อมูลห้องพักได้</p>
      </div>`;
    }


    const response = await axios.get(`${BASE_URL}/getBills/${id}`, {
      headers: {
        'authorization': `Bearer ${authToken}`
      }
    });

    let data = response.data.bill || response.data;
    if (header) {
      header.innerText = `สถิติการใช้ไฟฟ้าและน้ำ ห้อง ${id}`;
    }

    if (response.data.message === 'use in stat') {
      data = data.slice(-12);

      if (header) {
        header.innerText = 'สถิติการใช้ไฟฟ้าและน้ำทุกห้อง';
      }

      const newObject1 = {
        create_at: data[0].create_at,
        last_elec: data[0].last_elec + data[1].last_elec + data[2].last_elec,
        last_water: data[0].last_water + data[1].last_water + data[2].last_water,
        previous_elec: data[0].previous_elec + data[1].previous_elec + data[2].previous_elec,
        previous_water: data[0].previous_water + data[1].previous_water + data[2].previous_water
      }

      const newObject2 = {
        create_at: data[3].create_at,
        last_elec: data[3].last_elec + data[4].last_elec + data[5].last_elec,
        last_water: data[3].last_water + data[4].last_water + data[5].last_water,
        previous_elec: data[3].previous_elec + data[4].previous_elec + data[5].previous_elec,
        previous_water: data[3].previous_water + data[4].previous_water + data[5].previous_water
      };

      const newObject3 = {
        create_at: data[6].create_at,
        last_elec: data[6].last_elec + data[7].last_elec + data[8].last_elec,
        last_water: data[6].last_water + data[7].last_water + data[8].last_water,
        previous_elec: data[6].previous_elec + data[7].previous_elec + data[8].previous_elec,
        previous_water: data[6].previous_water + data[7].previous_water + data[8].previous_water
      }

      const newObject4 = {
        create_at: data[9].create_at,
        last_elec: data[9].last_elec + data[10].last_elec + data[11].last_elec,
        last_water: data[9].last_water + data[10].last_water + data[11].last_water,
        previous_elec: data[9].previous_elec + data[10].previous_elec + data[11].previous_elec,
        previous_water: data[9].previous_water + data[10].previous_water + data[11].previous_water
      }

      data.push(newObject1);
      data.push(newObject2);
      data.push(newObject3);
      data.push(newObject4);
    }
    data = data.slice(-4);

    // ฟังก์ชันเพื่อแปลงวันที่เป็นรูปแบบ "1 ตุลาคม 2567"
    const formatDateThai = (dateString) => {
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม",
        "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม",
        "พฤศจิกายน", "ธันวาคม"
      ];

      const date = new Date(dateString);
      const day = date.getDate(); // วันที่
      const month = months[date.getMonth()]; // เดือน
      const year = date.getFullYear() + 543; // ปีในระบบไทย (บวก 543)

      return `${day} ${month} ${year}`; // สร้างรูปแบบวันที่
    };

    // ตรวจสอบจำนวนข้อมูลที่มีอยู่
    const labels = [];
    const elec_values = [];
    const water_values = [];

    // สร้าง labels และ values ตามจำนวนข้อมูลที่มี
    for (let i = 0; i < data.length; i++) {
      labels.push(formatDateThai(data[i].create_at)); // แปลง create_at เป็นรูปแบบที่ต้องการ
      elec_values.push(data[i].last_elec - data[i].previous_elec);
      water_values.push(data[i].last_water - data[i].previous_water);
    }
    console.log(water_values)
    // Electricity Chart Data
    const ctxElectricity = document.getElementById('electricityChart').getContext('2d');
    const electricityChart = new Chart(ctxElectricity, {
      type: 'bar',
      data: {
        labels: labels, // ใช้ labels ที่สร้างขึ้น
        datasets: [{
          label: 'ไฟฟ้า (หน่วย)',
          data: elec_values, // ใช้ values ที่สร้างขึ้น
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y', // Set to horizontal bar chart
        scales: {
          x: {
            beginAtZero: true,
            min: 10 // เปลี่ยนเป็นค่าที่ต้องการเริ่มต้น (เช่น 10)
          }
        }
      }
    });



    // Water Chart Data
    const ctxWater = document.getElementById('waterChart').getContext('2d');
    const waterChart = new Chart(ctxWater, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'น้ำ (หน่วย)',
          data: water_values,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y', // Set to horizontal bar chart
        scales: {
          x: {
            beginAtZero: true,
          }
        }
      }
    });
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.message === 'Invalid or expired token') {
      sessionStorage.removeItem('token');
      window.location.href = `${BASE_URL}/login.html`;
    } else if (error.response?.data?.message === 'Access denied') {
      if(!error.response.data.room){
        document.body.innerHTML = `<h1>Wait for Admin...</h1>`
        alert("You haven't assign to any room!!")
        return
      }
      console.log("Access denied")
      window.location.replace(`http://localhost:8000/?id=${error.response.data.room}`);
    } else {
      document.body.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
  }
}


