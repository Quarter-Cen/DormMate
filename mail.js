window.onload = () => {
  pollForNewQR(); // เริ่มทำการ polling ทันทีที่โหลดหน้า
};

document.addEventListener('DOMContentLoaded', function () {
  const loginBtn = document.getElementById('loginBtn');
  const getEmailsBtn = document.getElementById('getEmailsBtn');
  const stopBtn = document.getElementById('stopBtn');
  const emailsContainer = document.getElementById('emailsContainer');
  const emailsList = document.getElementById('emailsList');
  const timerElement = document.getElementById('timer');
  let fetchEmailsInterval, countdownInterval;
  let bill_id; // Initialize bill_id

  function init() {
      loginBtn.addEventListener('click', handleLogin);
      getEmailsBtn.addEventListener('click', handleGetEmails);
      stopBtn.addEventListener('click', handleStop);

      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      bill_id = urlParams.get('bill_id'); // Get bill_id from URL
      if (accessToken) {
          localStorage.setItem('access_token', accessToken);
          emailsContainer.style.display = 'block';
      }
  }

  function handleLogin() {
      fetch('/auth/google')
          .then(response => response.json())
          .then(data => {
              window.open(data.authUrl, '_self');
          })
          .catch(error => {
              console.error('Error initiating OAuth:', error);
              alert('Error initiating OAuth. Please try again later.');
          });
  }

  function startCountdown(duration) {
      let remainingTime = duration;

      const updateTimer = () => {
          const minutes = Math.floor(remainingTime / 60);
          const seconds = remainingTime % 60;
          timerElement.textContent = `Time remaining: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          if (remainingTime <= 0) {
              clearInterval(countdownInterval);
          } else {
              remainingTime--;
          }
      };

      updateTimer();
      countdownInterval = setInterval(updateTimer, 1000);
  }

  function handleGetEmails() {
      if (bill_id) {
          fetchEmails(bill_id); // Pass bill_id to fetchEmails
      } else {
          console.error('Bill ID is not available');
      }
  }

  function handleStop() {
      clearTimeout(fetchEmailsInterval);
      clearInterval(countdownInterval);
      console.log('Email fetching stopped.');
  }

  init();
});

async function fetchEmails(bill_id) {
  const fetchInterval = 5000; // 5 วินาที
  const duration = 180; // 3 นาทีในหน่วยวินาที
  const endTime = Date.now() + duration * 1000;



  const fetchEmailsData = async () => {
      try {
          const response = await fetch('/emails', {
              method: 'GET',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
          });

          const data = await response.json();
          console.log('Data received:', data);
          const scbEmails = Array.isArray(data) ? data.filter(email => email.from.includes('@scb.co.th')) : [];
          emailsList.innerHTML = scbEmails.map(email => `
              <div class="email">
                  <h3>${email.subject}</h3>
                  <p>From: ${email.from}</p>
                  <p>Date: ${new Date(email.date).toLocaleString()}</p>
                  <p>Snippet: ${email.snippet}</p>
                  <p>Id: ${email.id}</p>
              </div>
          `).join('');
          emailsContainer.style.display = 'block';
          
          // ตรวจสอบและอัปเดตสถานะในฐานข้อมูล
          await Promise.all(scbEmails.map(email => checkAndUpdateStatus(email, bill_id)));
          console.log(Date.now())
          if (Date.now() < endTime) {
              fetchEmailsInterval = setTimeout(fetchEmailsData, fetchInterval);
          }
      } catch (error) {
          console.error('Error:', error);
          alert('Fetching Email Error');
      }
  };

  fetchEmailsData();
}

// Function to check and update the status in the database
function checkAndUpdateStatus(email, bill_id)  {
  const emailId = email.id;
  const snippet = email.snippet;
  console.log(emailId)
  // Extract Amount and Date/time from the snippet using RegEx
  const amountMatch = snippet.match(/Amount \(Baht\): ([\d,]+\.\d{2})/);

  if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(',', '')); // Convert amount to float

      fetch('/check-email', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount, emailId, bill_id })
      })
      .then(response => response.json())
      .then(result => {
          if (result.match) {
              console.log(`Email with Amount: ${amount} matched. Status updated.`);
              clearTimeout(fetchEmailsInterval);
              console.log('Email fetching stopped.');
              fetch('/admin-res', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bill_id })
              })
          } else {
              console.log(`Email with Amount: ${amount} did not match.`);
          }
      })
      .catch(error => {
          console.error('Error checking email status:', error);
      });
  }
}

async function pollForNewQR() {
  try {
      const response = await fetch('http://localhost:8000/poll');
      const data = await response.json();

      if (data.billId) {
          console.log(`New QR code generated for bill ID ${data.billId}`);
          fetchEmails(data.billId);
      }

      // ทำการ polling ต่อไป
      setTimeout(pollForNewQR, 1000); // Polling interval
  } catch (error) {
      console.error('Polling error:', error);
      setTimeout(pollForNewQR, 5000); // Retry after 5 seconds
  }
}
