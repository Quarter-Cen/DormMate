document.addEventListener('DOMContentLoaded', () => {
    const backgroundContainer = document.querySelector('.background-container');
    const circleCount = 30; // จำนวนวงกลม

    // สร้างวงกลม
    for (let i = 0; i < circleCount; i++) {
        const circle = document.createElement('div');
        circle.className = 'circle';
        circle.style.width = `${Math.random() * 100 + 50}px`; // ขนาดกว้างแบบสุ่ม
        circle.style.height = circle.style.width;
        circle.style.top = `${Math.random() * 100}%`; // ตำแหน่งสุ่ม
        circle.style.left = `${Math.random() * 100}%`; // ตำแหน่งสุ่ม
        backgroundContainer.appendChild(circle);
    }

    // ปรับตำแหน่งของวงกลมตามการเลื่อน
    function updateCirclePositions() {
        const scrollTop = window.scrollY;

        document.querySelectorAll('.circle').forEach(circle => {
            const newTop = parseFloat(circle.style.top) + scrollTop * 0.05; // ปรับความเร็วในการเคลื่อนไหว
            circle.style.top = `${newTop}%`;
        });

        requestAnimationFrame(updateCirclePositions);
    }

    updateCirclePositions(); // เรียกใช้ฟังก์ชันเริ่มต้น
});
