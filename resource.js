// Mock Data for Resources
const resources = [
    { id: 1, name: "Classroom 101", type: "Classroom", capacity: 60, equip: ["projector"], status: "available" },
    { id: 2, name: "Lab A", type: "Lab", capacity: 40, equip: ["projector", "gpu"], status: "occupied", nextTime: "2:00 PM" },
    { id: 3, name: "Seminar Hall", type: "Hall", capacity: 150, equip: ["projector"], status: "available" },
    { id: 4, name: "AI/ML Workstations", type: "Lab", capacity: 20, equip: ["gpu"], status: "maintain", note: "Reserved for Faculty" },
    { id: 5, name: "Private Pod 1", type: "Study Room", capacity: 5, equip: [], status: "available" },
    { id: 6, name: "Robotics Lab", type: "Lab", capacity: 30, equip: ["gpu", "projector"], status: "occupied", nextTime: "4:30 PM" }
];

let calendar; // global calendar instance
let approvedStudents = JSON.parse(localStorage.getItem('approved_students')) || [];
document.addEventListener("DOMContentLoaded", () => {
    // 1. Simulate Skeleton Loading before rendering grid
    setTimeout(() => {
        renderGrid();
    }, 800);

    // 2. Generate QR Code for Digital Pass
    new QRCode(document.getElementById("qrcode"), {
        text: "JWT_SECURE_PAYLOAD_HERE",
        width: 150,
        height: 150,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // 3. Initialize Admin Chart.js
    initChart();
    renderFacultyRequests();
});

function renderGrid() {
    const grid = document.getElementById("resourceGrid");
    grid.innerHTML = ""; // clear skeletons/old data

    const filterCap = document.getElementById("filterCap").value;
    const filterEq = document.getElementById("filterEquip").value;

    const filtered = resources.filter(r => {
        let capMatch = filterCap === "all" ? true : r.capacity > 50;
        let eqMatch = filterEq === "all" ? true : r.equip.includes(filterEq);
        return capMatch && eqMatch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = "<p>No resources found matching criteria.</p>";
        return;
    }

    filtered.forEach(r => {
        const card = document.createElement("div");
        card.className = `resource-card status-${r.status}`;
        card.onclick = () => openBookingModal(r);
        
        let badgeHtml = "";
        if (r.status === "available") badgeHtml = `<span class="status-badge">Available Now</span>`;
        if (r.status === "occupied") badgeHtml = `<span class="status-badge">Occupied until ${r.nextTime}</span>`;
        if (r.status === "maintain") badgeHtml = `<span class="status-badge">Maintenance</span>`;

        card.innerHTML = `
            ${badgeHtml}
            <h3>${r.name}</h3>
            <p class="capacity"><i class="fa-solid fa-users"></i> Seats: ${r.capacity}</p>
            <p style="font-size:13px; color:var(--text-light)">
                ${r.equip.includes('gpu') ? '<i class="fa-solid fa-microchip"></i> GPU ' : ''}
                ${r.equip.includes('projector') ? '<i class="fa-solid fa-video"></i> Projector' : ''}
                ${r.equip.length === 0 ? 'Standard Amenities' : ''}
            </p>
        `;
        grid.appendChild(card);
    });
}

function switchRole(role) {
    document.querySelectorAll('.dashboard-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`dash-${role}`).classList.add('active');
    showToast(`Switched to ${role.toUpperCase()} View`);
}

function openBookingModal(resource) {
    if (resource.status === "maintain") {
        showToast("This resource is under maintenance and cannot be booked currently.");
        return;
    }
    
    document.getElementById("modalResourceName").innerText = `Book ${resource.name}`;
    document.getElementById("slideOverlay").classList.add("active");
    document.getElementById("bookingModal").classList.add("active");

    // Initialize FullCalendar lazily when modal opens
    if (!calendar) {
        var calendarEl = document.getElementById('calendar');
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridDay',
            headerToolbar: { left: '', center: 'title', right: '' },
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00',
            selectable: true,
            selectOverlap: false,
            events: [
                // Mock existing booking preventing overlap
                {
                    title: 'Occupied',
                    start: new Date().toISOString().split('T')[0] + 'T10:00:00',
                    end: new Date().toISOString().split('T')[0] + 'T12:00:00',
                    color: '#ef4444'
                }
            ],
            select: function(info) {
                // Auth Prompt
                let userName = prompt(`Booking [${resource.name}].\nEnter your registered Name:`);
                if (!userName) {
                    calendar.unselect();
                    return;
                }

                // Verify User
                let lmsStudents = JSON.parse(localStorage.getItem('university_students')) || [];
                let facMembers = JSON.parse(localStorage.getItem('university_faculty')) || [];

                let isStudent = lmsStudents.some(s => s.name.toLowerCase() === userName.toLowerCase());
                let isFaculty = facMembers.some(f => f.name.toLowerCase() === userName.toLowerCase());

                if (!isStudent && !isFaculty) {
                    alert("Unauthorized Access! You must be registered in the Student or Faculty Management system to book resources.");
                    calendar.unselect();
                    return;
                }

               if (isStudent) {

    let studentAcademics = JSON.parse(localStorage.getItem('student_academics')) || {};
    let acInfo = studentAcademics[userName.toLowerCase()];

    if (!acInfo || !acInfo.enrolled) {
        alert("Access Denied! Complete Enrollment First.");
        calendar.unselect();
        return;
    }

    if (!acInfo.semRegistered) {
        alert("Access Denied! Semester Registration Required.");
        calendar.unselect();
        return;
    }

    if (acInfo.attendance < 50) {
        alert(`Access Denied! Attendance is ${acInfo.attendance}%`);
        calendar.unselect();
        return;
    }

    // Faculty approval required before students can book
    let requests = JSON.parse(localStorage.getItem('resource_requests')) || [];
    const studentKey = userName.toLowerCase();
    const existingRequest = requests.find(r =>
        r.name.toLowerCase() === studentKey &&
        r.resource === resource.name
    );

    if (existingRequest) {
        if (existingRequest.status === 'Pending') {
            alert('Your request is pending faculty approval. You cannot book until approved.');
            calendar.unselect();
            return;
        }
        if (existingRequest.status === 'Denied') {
            alert('Faculty denied your request. You cannot book this resource.');
            calendar.unselect();
            return;
        }
        if (existingRequest.status !== 'Approved') {
            calendar.unselect();
            return;
        }
    } else {
        requests.push({
            name: userName,
            resource: resource.name,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        });
        localStorage.setItem('resource_requests', JSON.stringify(requests));
        alert('Permission request sent to faculty. You can book only after they approve.');
        renderFacultyRequests();
        calendar.unselect();
        closeModal();
        return;
    }
}

                let history = JSON.parse(localStorage.getItem('resource_bookings')) || [];
                let role = isFaculty ? 'faculty' : 'student';
                let status = "Approved";

                history.push({
                   name: userName,
                   role: role,
                   resource: resource.name,
                   time: new Date(info.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
                   status: status
                });

                localStorage.setItem('resource_bookings', JSON.stringify(history));
                closeModal();

                if (status === "Approved") {
                   showToast(`Success! ${resource.name} booked for ${userName}.`);
                   const feed = document.getElementById("liveFeed");
                   feed.innerHTML = `<li><span class="badge" style="background:#3b82f6;color:white;">Booked</span> ${userName} reserved ${resource.name}</li>` + feed.innerHTML;
                } else {
                   showToast(`Booking Failed: ${resource.name} is currently unavailable for students.`);
                }
            }
        });
    }
    calendar.render();
}

function closeModal() {
    document.getElementById("slideOverlay").classList.remove("active");
    document.getElementById("bookingModal").classList.remove("active");
}

/* UI Utilities */
function showToast(msg) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-msg").innerText = msg;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function simulateDoorScan() {
    const scanner = document.getElementById("scannerModal");
    scanner.style.display = "flex";
    document.getElementById("scanResult").innerText = "Awaiting QR Code...";
    document.getElementById("scanResult").style.color = "white";

    setTimeout(() => {
        document.getElementById("scanResult").innerText = "Access Granted. Welcome!";
        document.getElementById("scanResult").style.color = "#10b981"; // Green Flash
        const icon = document.querySelector(".scan-icon");
        icon.classList.remove("fa-qrcode");
        icon.classList.add("fa-check-circle");
        
        setTimeout(() => {
            scanner.style.display = "none";
            icon.classList.add("fa-qrcode");
            icon.classList.remove("fa-check-circle");
        }, 1500);
    }, 1500);
}

function mockScan(context) {
    simulateDoorScan();
}

function initChart() {
    const ctx = document.getElementById('heatmapChart');
    if(ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Class 101', 'Lab A', 'Sem. Hall', 'Robotics', 'Pod 1'],
                datasets: [{
                    label: 'Occupancy %',
                    data: [85, 100, 10, 95, 40],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(239, 68, 68, 0.9)',
                        'rgba(16, 185, 129, 0.5)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(59, 130, 246, 0.5)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
}
function renderFacultyRequests() {

    const container = document.getElementById('facultyRequestList');

    if (!container) return;

    let requests = JSON.parse(localStorage.getItem('resource_requests')) || [];

    if (requests.length === 0) {
        container.innerHTML = '<p>No pending requests.</p>';
        return;
    }

    container.innerHTML = '';

    requests.forEach((req, index) => {

        const div = document.createElement('div');

        div.className = 'action-card';

        div.style.marginBottom = '15px';

        div.innerHTML = `
            <h4>${req.name}</h4>
            <p>Requested Resource: ${req.resource}</p>
            <p>Status: <b>${req.status}</b></p>

            ${req.status === 'Pending' ? `
                <button class="btn-fancy btn-small"
                    onclick="approveRequest(${index})">
                    Approve
                </button>
                <button class="btn-fancy btn-small warning-btn"
                    onclick="denyRequest(${index})">
                    Deny
                </button>
            ` : ''}
        `;

        container.appendChild(div);
    });
}

function approveRequest(index) {
    let requests = JSON.parse(localStorage.getItem('resource_requests')) || [];
    if (!requests[index] || requests[index].status !== 'Pending') return;

    requests[index].status = 'Approved';
    requests[index].reviewedAt = new Date().toISOString();
    localStorage.setItem('resource_requests', JSON.stringify(requests));

    showToast('Approved. Student can now book this resource.');
    renderFacultyRequests();
}

function denyRequest(index) {
    let requests = JSON.parse(localStorage.getItem('resource_requests')) || [];
    if (!requests[index] || requests[index].status !== 'Pending') return;

    requests[index].status = 'Denied';
    requests[index].reviewedAt = new Date().toISOString();
    localStorage.setItem('resource_requests', JSON.stringify(requests));

    showToast('Request denied. Student cannot book this resource.');
    renderFacultyRequests();
}

function viewMyRequests() {
    let userName = prompt('Enter your registered name to view your requests:');
    if (!userName) return;

    let requests = JSON.parse(localStorage.getItem('resource_requests')) || [];
    const mine = requests.filter(r => r.name.toLowerCase() === userName.toLowerCase());

    if (mine.length === 0) {
        alert('No requests found for this name.');
        return;
    }

    let text = 'Your resource permission requests:\n\n';
    mine.forEach(r => {
        text += `${r.resource}: ${r.status}\n`;
    });
    alert(text);
}