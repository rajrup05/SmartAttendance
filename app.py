from flask import Flask, render_template, request, jsonify
import face_recognition
import os
import datetime
import numpy as np
import json
import time

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'ImagesAttendance'

STUDENTS_FILE = 'students.json'
ATTENDANCE_FILE = 'attendance.json'


def init_files():
    for file in [STUDENTS_FILE, ATTENDANCE_FILE]:
        if not os.path.exists(file):
            with open(file, 'w') as f:
                json.dump([], f)


init_files()

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/register', methods=['POST'])
def register():
    try:
        name = request.form['name']
        image = request.files['image']
        img_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{name}_{datetime.datetime.now().timestamp()}.jpg")
        image.save(img_path)

        img = face_recognition.load_image_file(img_path)
        encodings = face_recognition.face_encodings(img)
        if not encodings:
            os.remove(img_path)
            return jsonify({'success': False, 'message': 'No face detected'})

        with open(STUDENTS_FILE, 'r+') as f:
            students = json.load(f)
            students.append({
                'name': name,
                'img_path': img_path,
                'encoding': encodings[0].tolist()
            })
            f.seek(0)
            json.dump(students, f)

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

known_encodings = None
known_names = None

def load_students():
    global known_encodings, known_names
    with open(STUDENTS_FILE, 'r') as f:
        students = json.load(f)
    known_encodings = [np.array(s['encoding']) for s in students]
    known_names = [s['name'] for s in students]

@app.route('/attendance', methods=['POST'])
def mark_attendance():
    start_time = time.time()
    try:
        global known_encodings, known_names
        if known_encodings is None or known_names is None:
            load_students()
        image = request.files['image']
        temp_path = "temp.jpg"
        image.save(temp_path)
        img = face_recognition.load_image_file(temp_path)

        face_locations = face_recognition.face_locations(img, model="hog")
        face_encodings = face_recognition.face_encodings(img, face_locations)

        os.remove(temp_path)

        with open(STUDENTS_FILE, 'r') as f:
            students = json.load(f)
        known_encodings = [np.array(s['encoding']) for s in students]
        known_names = [s['name'] for s in students]

        today = datetime.datetime.now().strftime("%Y-%m-%d")
        with open(ATTENDANCE_FILE, 'r') as f:
            existing_records = [r for r in json.load(f) if r['date'] == today]
        present_students = {r['student_name'] for r in existing_records}

        results = []

        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(known_encodings, face_encoding)
            distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_match = np.argmin(distances)
            name = known_names[best_match] if matches[best_match] else "Unknown"

            if name != "Unknown" and name not in present_students:
                current_time = datetime.datetime.now().strftime("%H:%M:%S")
                with open(ATTENDANCE_FILE, 'r+') as f:
                    records = json.load(f)
                    records.append({
                        'date': today,
                        'time': current_time,
                        'student_name': name,
                        'status': 'Present'
                    })
                    f.seek(0)
                    json.dump(records, f)
                present_students.add(name)
                results.append(name)
            end_time = time.time()
            print(f"Time taken: {end_time - start_time:.2f} seconds")
        return jsonify({
            'success': True,
            'names': results
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/get_attendance', methods=['GET'])
def get_attendance():
    date = request.args.get('date')
    with open(ATTENDANCE_FILE, 'r') as f:
        records = json.load(f)
    filtered = [r for r in records if r['date'] == date]
    return jsonify(filtered)

@app.route('/get_attendance_percentage', methods=['GET'])
def get_attendance_percentage():
    try:
        # Get the start and end dates from the request parameters
        start_date = request.args.get('start')
        end_date = request.args.get('end')

        if not start_date or not end_date:
            return jsonify({'success': False, 'message': 'Please provide both start and end dates.'}), 400

        # Load attendance records
        with open(ATTENDANCE_FILE, 'r') as f:
            attendance_records = json.load(f)

        # Filter records within the date range
        filtered_records = [r for r in attendance_records if start_date <= r['date'] <= end_date]

        # Count the total number of days classes were held
        class_days = set([r['date'] for r in filtered_records])
        total_class_days = len(class_days)

        if total_class_days == 0:
            return jsonify({'success': False, 'message': 'No attendance records found for the selected date range.'})

        # Calculate attendance percentage for each student
        student_attendance = {}
        for record in filtered_records:
            name = record['student_name']
            if name not in student_attendance:
                student_attendance[name] = 0
            student_attendance[name] += 1

        # Total attendance percentages
        attendance_data = []
        for name, days_present in student_attendance.items():
            percentage = (days_present / total_class_days) * 100
            attendance_data.append({'name': name, 'percentage': round(percentage, 2)})

        return jsonify({'success': True, 'data': attendance_data})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
from flask import send_file
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

@app.route('/download_attendance_pdf', methods=['GET'])
def download_attendance_pdf():
    try:
        date = request.args.get('date')
        if not date:
            return jsonify({'success': False, 'message': 'Date parameter is required'}), 400

        with open(ATTENDANCE_FILE, 'r') as f:
            records = [r for r in json.load(f) if r['date'] == date]

        if not records:
            return jsonify({'success': False, 'message': 'No attendance records found'}), 404

        # Create PDF file
        pdf_filename = f"Attendance_{date}.pdf"
        c = canvas.Canvas(pdf_filename, pagesize=letter)
        c.setFont("Helvetica", 14)
        c.drawString(200, 750, f"Attendance Report - {date}")

        c.setFont("Helvetica", 12)
        y = 700  # Starting Y position for table

        # Table Headers
        c.drawString(100, y, "Student Name")
        c.drawString(300, y, "Time")
        c.drawString(450, y, "Status")
        y -= 20  # Move downward

        # Attendance Records
        for record in records:
            c.drawString(100, y, record["student_name"])
            c.drawString(300, y, record["time"])
            c.drawString(450, y, record["status"])
            y -= 20

        c.save()  # Save PDF

        return send_file(pdf_filename, as_attachment=True)

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
