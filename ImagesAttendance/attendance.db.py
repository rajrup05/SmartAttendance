import sqlite3

conn = sqlite3.connect('attendance.db')
c = conn.cursor()

# Create tables
c.execute('''CREATE TABLE IF NOT EXISTS students
             (id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              image_path TEXT NOT NULL,
              encoding BLOB NOT NULL)''')

c.execute('''CREATE TABLE IF NOT EXISTS attendance
             (id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              student_name TEXT NOT NULL,
              status TEXT NOT NULL)''')

conn.commit()
conn.close()