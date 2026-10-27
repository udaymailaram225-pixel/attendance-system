
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

app.get('/api/students', async (req, res) => {
  try {
    res.json(await query('SELECT * FROM students ORDER BY roll_no'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, roll_no, department } = req.body;
    if (![name, roll_no, department].every(
      v => typeof v === 'string' && v.trim()
    )) {
      return res.status(400).json({
        error: 'Name, roll number and department are required.'
      });
    }

    const result = await execute(
      'INSERT INTO students (name, roll_no, department) VALUES (?, ?, ?)',
      [name.trim(), roll_no.trim(), department.trim()]
    );

    res.status(201).json({ id: result.id, message: 'Student added.' });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 500).json({
      error: err.message.includes('UNIQUE')
        ? 'That roll number already exists.'
        : err.message
    });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    await execute('DELETE FROM attendance WHERE student_id = ?', [id]);

    const result = await execute(
      'DELETE FROM students WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({ message: 'Student and attendance records deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const { date, period } = req.query;
    if (!date || !period) {
      return res.status(400).json({ error: 'Date and period are required.' });
    }

    res.json(await query(`
      SELECT s.id, s.name, s.roll_no, s.department, a.status
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id AND a.date = ? AND a.period = ?
      ORDER BY s.roll_no
    `, [date, Number(period)]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { student_id, date, period, status } = req.body;
    if (!Number.isInteger(Number(student_id)) ||
        !date ||
        !Number.isInteger(Number(period)) ||
        Number(period) < 1 ||
        !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ error: 'Invalid attendance details.' });
    }

    await execute(`
      INSERT INTO attendance (student_id, date, period, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, date, period)
      DO UPDATE SET status = excluded.status
    `, [Number(student_id), date, Number(period), status]);

    res.json({ message: 'Attendance saved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report', async (req, res) => {
  try {
    const month = req.query.month;
    if (!/^\d{4}-\d{2}$/.test(month || '') ||
        Number(month.slice(5, 7)) < 1 ||
        Number(month.slice(5, 7)) > 12) {
      return res.status(400).json({ error: 'Select a valid month.' });
    }

    res.json(await query(`
      SELECT s.id, s.name, s.roll_no, s.department,
        COUNT(a.id) AS working_periods,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        ROUND(
          100.0 * SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(a.id), 0), 2
        ) AS percentage
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id AND substr(a.date, 1, 7) = ?
      GROUP BY s.id
      ORDER BY s.roll_no
    `, [month]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/report.csv', async (req, res) => {
  try {
    const month = req.query.month;
    if (!/^\d{4}-\d{2}$/.test(month || '') ||
        Number(month.slice(5, 7)) < 1 ||
        Number(month.slice(5, 7)) > 12) {
      return res.status(400).json({ error: 'Select a valid month.' });
    }

    const rows = await query(`
      SELECT s.roll_no, s.name, s.department,
        COUNT(a.id) AS working_periods,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
        ROUND(
          100.0 * SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(a.id), 0), 2
        ) AS percentage
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id AND substr(a.date, 1, 7) = ?
      GROUP BY s.id
      ORDER BY s.roll_no
    `, [month]);

    const csvCell = value =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const lines = [
      ['Roll No', 'Name', 'Department', 'Recorded Periods',
       'Present', 'Absent', 'Percentage'].map(csvCell).join(','),
      ...rows.map(r => [
        r.roll_no, r.name, r.department, r.working_periods,
        r.present, r.absent, r.percentage
      ].map(csvCell).join(','))
    ];

    res.type('text/csv');
    res.attachment(`attendance-${month}.csv`);
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Attendance app running at http://localhost:${PORT}`);
});