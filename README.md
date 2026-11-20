# SmartAttendance

A browser-based attendance system that uses facial recognition to register students and mark attendance in real time.

## Features

- Register students through the browser camera.
- Detect and recognize faces with `face_recognition`.
- Start and stop classroom attendance sessions.
- Prevent duplicate attendance entries for the same student on the same day.
- View attendance records by date.
- Calculate attendance percentages across a date range.
- Download daily attendance reports as PDF files.
- Toggle between light and dark themes.

## Tech stack

- **Backend:** Python, Flask
- **Computer vision:** `face_recognition`, NumPy
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Storage:** JSON files
- **Reports:** ReportLab

## Requirements

- Python 3.9 or newer
- A webcam
- CMake and a C++ build toolchain (required by `dlib`, which is used by `face_recognition`)

## Installation

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/rajrup05/SmartAttendance.git
   cd SmartAttendance
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

   On Windows PowerShell, use `.venv\Scripts\Activate.ps1` instead.

3. Install the Python dependencies:

   ```bash
   pip install Flask face-recognition numpy reportlab
   ```

   If installing `face-recognition` fails, install the platform prerequisites for `dlib` first, then rerun the command.

## Running the application

Start the Flask server:

```bash
python app.py
```

Open <http://127.0.0.1:5000> in a browser and allow camera access when prompted.

For camera access and reliable browser behavior, use `localhost` or `127.0.0.1` during local development. The browser may require HTTPS when the app is deployed to another host.

## Usage

1. Enter a student's name and select **Open Camera**.
2. Capture an image to register the student's face.
3. Select **Start** under Class Attendance to begin recognition. Frames are submitted every five seconds.
4. Select **End** to stop the session.
5. Choose a date to view records or download a PDF report.
6. Select a start and end date to view attendance percentages.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Render the dashboard. |
| `POST` | `/register` | Register a student from a name and uploaded image. |
| `POST` | `/attendance` | Recognize faces in an uploaded image and mark attendance. |
| `GET` | `/get_attendance?date=YYYY-MM-DD` | Return records for a date. |
| `GET` | `/get_attendance_percentage?start=YYYY-MM-DD&end=YYYY-MM-DD` | Return attendance percentages for a date range. |
| `GET` | `/download_attendance_pdf?date=YYYY-MM-DD` | Download a PDF report for a date. |

## Data files

The application creates these files automatically when they do not exist:

- `students.json` — registered names, image paths, and face encodings.
- `attendance.json` — attendance dates, times, names, and statuses.
- `ImagesAttendance/` — captured registration images.

These files contain personal and biometric-related data. Keep them private and add appropriate access controls before deploying the application publicly.

## Notes

- The application currently runs with Flask debug mode enabled in `app.py`; disable debug mode for production.
- Attendance percentage calculations use the dates present in the selected attendance records as class days.
- Recognition depends on image quality, lighting, camera placement, and the installed `face_recognition` model dependencies.

## License

No license has been specified for this repository.