let registrationStream = null;
let attendanceStream = null;
let isClassRunning = false;
let intervalId = null;
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        document.getElementById("loadingScreen").style.display = "none";
        document.body.style.overflow = "auto";
    }, 800); // Customizable loading duration
});

// Get the toggle switch and body element
const themeToggle = document.getElementById('theme-toggle-switch');
const body = document.body;

// Check localStorage for theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    themeToggle.checked = true;
}

// Add event listener to toggle switch
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark'); // Save preference to localStorage
    } else {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light'); // Save preference to localStorage
    }
});
async function startRegistration() {
    const studentName = document.getElementById('studentName').value;
    if (!studentName) {
        showAlert('registrationAlert', 'Please enter student name', 'danger');
        return;
    }

    try {
        if (registrationStream) {
            registrationStream.getTracks().forEach(track => track.stop());
        }

        registrationStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });

        const video = document.getElementById('registrationVideo');
        video.srcObject = registrationStream;
        document.querySelector('button[onclick="captureRegistration()"]').style.display = 'inline-block';
        showAlert('registrationAlert', 'Camera ready for registration', 'success');
    } catch (err) {
        console.error('Error accessing camera:', err);
        showAlert('registrationAlert', 'Camera access denied! Please allow permissions.', 'danger');
    }
}

async function captureRegistration() {
    const video = document.getElementById('registrationVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const formData = new FormData();
    formData.append('name', document.getElementById('studentName').value);

    try {
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg');
        });
        formData.append('image', blob, 'image.jpg');

        showLoading(true);
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            showAlert('registrationAlert', 'Student registered successfully!', 'success');
            stopRegistrationCamera();
            document.getElementById('studentName').value = '';
        } else {
            showAlert('registrationAlert', result.message || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('registrationAlert', 'Registration failed: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function stopRegistrationCamera() {
    if (registrationStream) {
        registrationStream.getTracks().forEach(track => track.stop());
        document.getElementById('registrationVideo').srcObject = null;
        document.querySelector('button[onclick="captureRegistration()"]').style.display = 'none';
    }
}

async function startClass() {
    try {
        if (isClassRunning) endClass();

        attendanceStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } }
        });

        const video = document.getElementById('attendanceVideo');
        video.srcObject = attendanceStream;
        isClassRunning = true;

        showAlert('attendanceAlert', 'Class session started', 'success');
        intervalId = setInterval(captureAttendanceFrame, 5000);
    } catch (err) {
        console.error('Error starting class:', err);
        showAlert('attendanceAlert', 'Failed to access camera', 'danger');
    }
}

async function captureAttendanceFrame() {
    if (!isClassRunning) return;

    const video = document.getElementById('attendanceVideo');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const tempCtx = canvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg');
        });

        const formData = new FormData();
        formData.append('image', blob, 'image.jpg');

        showLoading(true);
        const response = await fetch('/attendance', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success && result.names.length > 0) {
            showAlert('attendanceAlert', `Attendance marked for: ${result.names.join(', ')}`, 'success');
        }
    } catch (error) {
        console.error('Error capturing frame:', error);
    } finally {
        showLoading(false);
    }
}

function endClass() {
    if (attendanceStream) {
        attendanceStream.getTracks().forEach(track => track.stop());
        attendanceStream = null;
        document.getElementById('attendanceVideo').srcObject = null;
    }
    clearInterval(intervalId);
    isClassRunning = false;
    showAlert('attendanceAlert', 'Attendance Marking Ended', 'info');
}
let selectedDate = null; // Global variable to store the selected date

// Initialize Flatpickr
flatpickr("#attendanceDate", {
    dateFormat: "Y-m-d", // Format the date as YYYY-MM-DD
    onChange: function(selectedDates, dateStr, instance) {
        selectedDate = dateStr; // Store the selected date
        viewAttendance(); // Load attendance records for the selected date
    },
});
// Initialize Flatpickr for Start and End Date fields
flatpickr("#startDate", {
    dateFormat: "Y-m-d"
});

flatpickr("#endDate", {
    dateFormat: "Y-m-d"
});

// Function to fetch and display attendance records
function viewAttendance() {
    if (!selectedDate ) {
        alert("Please select a date.");
        return;
    }

    // Show loading spinner
    document.getElementById("loadingSpinner").style.display = "block";

    // Fetch attendance records for the selected date
    fetch(`/get_attendance?date=${selectedDate}`)
        .then(response => response.json())
        .then(data => {
            // Hide loading spinner
            document.getElementById("loadingSpinner").style.display = "none";

            // Display attendance records
            displayAttendanceRecords(data);
        })
        .catch(error => {
            console.error("Error fetching attendance records:", error);
            document.getElementById("loadingSpinner").style.display = "none";
            alert("Failed to fetch attendance records.");
        });
}

// Function to refresh attendance records
function refreshAttendance() {
    if (selectedDate && isClassRunning ) {
        viewAttendance(); // Reload attendance records for the selected date
    }
}

// Function to display attendance records in a table
function displayAttendanceRecords(records) {
    const recordsContainer = document.getElementById("attendanceRecords");
    recordsContainer.innerHTML = "";

    if (records.length === 0) {
        recordsContainer.innerHTML = "<p>No records found for the selected date.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "attendance-table";

    // Create table header
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
        <th>Name</th>
        <th>Time</th>
        <th>Status</th>
    `;
    table.appendChild(headerRow);

    // Add records to the table
    records.forEach(record => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${record.student_name}</td>
            <td>${record.time}</td>
            <td>${record.status}</td>
        `;
        table.appendChild(row);
    });

    recordsContainer.appendChild(table);
}

// Polling: Refresh attendance records every 5 seconds
setInterval(refreshAttendance, 5000);
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("fetchPercentage").addEventListener("click", fetchAttendancePercentage);
});

function fetchAttendancePercentage() {
    let startDate = document.getElementById("startDate").value;
    let endDate = document.getElementById("endDate").value;

    if (!startDate || !endDate) {
        alert("Please select a start and end date.");
        return;
    }

    fetch(`/get_attendance_percentage?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.data.sort((a, b) => b.percentage - a.percentage);
                displayAttendancePercentage(data.data);
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error("Error fetching attendance percentage:", error);
            alert("Failed to fetch attendance percentage.");
        });
}

function displayAttendancePercentage(records) {
    const container = document.getElementById("attendancePercentageRecords");
    container.innerHTML = "";

    if (records.length === 0) {
        container.innerHTML = "<p>No records found for the selected date range.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "attendance-table";

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `<th>Name</th><th>Percentage</th>`;
    table.appendChild(headerRow);

    records.forEach(record => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${record.name}</td><td>${record.percentage}%</td>`;
        table.appendChild(row);
    });

    container.appendChild(table);
}
function downloadAttendancePDF() {
    const date = document.getElementById("attendanceDate").value;
    if (!date) {
        alert("Please select a date.");
        return;
    }
    window.location.href = `/download_attendance_pdf?date=${date}`;
}

// Utility functions
function showAlert(containerId, message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.appendChild(alertDiv);
}

function showLoading(show) {
    const spinner = document.querySelector('.loading-spinner');
    spinner.style.display = show ? 'inline-block' : 'none';
}

// Handle window resize
window.addEventListener('resize', () => {
    if (isClassRunning) {
        const video = document.getElementById('attendanceVideo');
        video.style.width = '100%';
        video.style.height = 'auto';
    }
});

