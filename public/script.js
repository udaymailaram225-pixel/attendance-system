
const $ = (id) => document.getElementById(id);

const today = new Date();
const localDate = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0')
].join('-');

$('attendance-date').value = localDate;
$('report-month').value = localDate.slice(0, 7);

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).classList.toggle('error', error);
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}


async function loadStudents() {
  const students = await api('/api/students');
  const body = $('students');
  body.replaceChildren();

  students.forEach(student => {
    const row = document.createElement('tr');

    row.append(
      cell(student.roll_no),
      cell(student.name),
      cell(student.department)
    );

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');

    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      if (!confirm(`Delete ${student.name} and all their attendance records?`)) {
        return;
      }

      try {
        await api(`/api/students/${student.id}`, {
          method: 'DELETE'
        });

        message('student-message', 'Student deleted.');
        await loadStudents();
        await loadAttendance();
        await loadReport();
      } catch (err) {
        message('student-message', err.message, true);
      }
    });

    actionCell.append(deleteButton);
    row.append(actionCell);
    body.append(row);
  });

  return students;
}


$('student-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await api('/api/students', {
      method: 'POST',
      body: JSON.stringify({
        name: $('name').value.trim(),
        roll_no: $('roll').value.trim(),
        department: $('department').value.trim()
      })
    });

    $('student-form').reset();
    message('student-message', 'Student added successfully.');
    await loadStudents();
    await loadAttendance();
  } catch (err) {
    message('student-message', err.message, true);
  }
});

async function loadAttendance() {
  try {
    const date = $('attendance-date').value;
    const period = $('period').value;

    if (!date) throw new Error('Choose an attendance date.');

    const students = await api(
      `/api/attendance?date=${encodeURIComponent(date)}&period=${period}`
    );

    const body = $('attendance-rows');
    body.replaceChildren();

    students.forEach(student => {
      const row = document.createElement('tr');
      row.dataset.studentId = student.id;

      row.append(cell(student.roll_no), cell(student.name));

      const td = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'attendance-status';

      [
        { value: '', label: 'Not marked' },
        { value: 'Present', label: 'Present' },
        { value: 'Absent', label: 'Absent' }
      ].forEach(option => {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        select.append(item);
      });

      select.value = student.status || '';
      td.append(select);
      row.append(td);
      body.append(row);
    });

    message('attendance-message', `${students.length} students loaded.`);
  } catch (err) {
    message('attendance-message', err.message, true);
  }
}

$('load-attendance').addEventListener('click', loadAttendance);
$('attendance-date').addEventListener('change', loadAttendance);
$('period').addEventListener('change', loadAttendance);

$('save-attendance').addEventListener('click', async () => {
  const rows = [...$('attendance-rows').querySelectorAll('tr')];

  if (!rows.length) {
    return message('attendance-message', 'Load students first.', true);
  }

  const unmarked = rows.some(row =>
    !row.querySelector('select').value
  );

  if (unmarked) {
    return message(
      'attendance-message',
      'Choose Present or Absent for every student.',
      true
    );
  }

  const button = $('save-attendance');
  button.disabled = true;

  try {
    for (const row of rows) {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          student_id: Number(row.dataset.studentId),
          date: $('attendance-date').value,
          period: Number($('period').value),
          status: row.querySelector('select').value
        })
      });
    }

    message('attendance-message', 'Attendance saved successfully.');
  } catch (err) {
    message('attendance-message', err.message, true);
  } finally {
    button.disabled = false;
  }
});

async function loadReport() {
  try {
    const month = $('report-month').value;
    if (!month) throw new Error('Choose a report month.');

    const rows = await api(`/api/report?month=${encodeURIComponent(month)}`);
    const body = $('report-rows');
    body.replaceChildren();

    rows.forEach(student => {
      const row = document.createElement('tr');
      const percentage = student.percentage;
      const hasRecords = Number(student.working_periods) > 0;

      row.append(
        cell(student.roll_no),
        cell(student.name),
        cell(student.working_periods),
        cell(student.present ?? 0),
        cell(student.absent ?? 0),
        cell(hasRecords ? `${percentage}%` : 'N/A')
      );

      const alert = cell(
        !hasRecords ? 'No records' :
        Number(percentage) < 75 ? 'Below 75%' : 'OK'
      );

      if (hasRecords && Number(percentage) < 75) {
        alert.className = 'low';
      }

      row.append(alert);
      body.append(row);
    });

    message('report-message', `${rows.length} students in report.`);
  } catch (err) {
    message('report-message', err.message, true);
  }
}

$('load-report').addEventListener('click', loadReport);

$('export-csv').addEventListener('click', () => {
  const month = $('report-month').value;

  if (!month) {
    return message('report-message', 'Choose a report month.', true);
  }

  window.location.href =
    `/api/report.csv?month=${encodeURIComponent(month)}`;
});

async function init() {
  try {
    await loadStudents();
    await loadAttendance();
  } catch (err) {
    message('student-message', err.message, true);
  }
}

init();
