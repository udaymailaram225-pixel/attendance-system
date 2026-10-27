
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./attendance.db', (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('SQLite database connected.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roll_no TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      period INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
      UNIQUE(student_id, date, period),
      FOREIGN KEY(student_id) REFERENCES students(id)
    )
  `);
});

module.exports = db;
