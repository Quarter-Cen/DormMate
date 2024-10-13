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
            </div>`;

            let userData = await axios.get(`${BASE_URL}/users/${id}`, {
                headers: {
                    'authorization': `Bearer ${authToken}`
                }
            });
            console.log(userData)
            userData = userData.data


            document.getElementById('firstname').innerHTML=`${userData.firstname}`
            document.getElementById('lastname').innerHTML=`${userData.lastname}`
            document.getElementById('nickname').innerHTML=`${userData.nickname}`
            document.getElementById('bd').innerHTML=formatDateThai(userData.birthdate)
            document.getElementById('sex').innerHTML=`${userData.gender}`
            document.getElementById('email').innerHTML=`${userData.email}`
            document.getElementById('room-number').innerHTML=`ID: ${id}`

            function formatDateThai(dateString) {
                if (!dateString) return 'ไม่มี'; // ถ้าไม่มีข้อมูลวันที่ ให้แสดงเป็น 'ไม่มี'
    
                const date = new Date(dateString);
                const options = {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Bangkok'
                };
    
                return new Intl.DateTimeFormat('th-TH', options).format(date);
            }
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
