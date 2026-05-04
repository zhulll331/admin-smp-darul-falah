import React, { useState, useEffect } from 'react';
import { 
  getSubjects, getStudents, getAllAttendances, getClasses, getTeachers, getJournals,
  getAllDailyAttendances, getAllTeacherAttendances
} from '../services/firestoreService';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper: normalize Firestore date (Timestamp or string) to 'YYYY-MM-DD'
function normalizeDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (typeof d.toDate === 'function') {
    const dateObj = d.toDate();
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }
  return null;
}

// Helper: get month label e.g. "April 2026" from "2026-04"
function getMonthLabel(ym) {
  const [y, m] = ym.split('-');
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// Helper: get number of days in a month
function getDaysInMonth(ym) {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m), 0).getDate();
}

// ======================== FLATTEN ATTENDANCE DATA ========================
function flattenAttendance(attendanceDocs, selectedMonth) {
  const map = new Map();
  attendanceDocs.forEach(doc => {
    const dateStr = normalizeDate(doc.date);
    if (!dateStr || !dateStr.startsWith(selectedMonth)) return;

    if (doc.records && Array.isArray(doc.records)) {
      doc.records.forEach(r => {
        if (r.studentId && r.status) {
          map.set(`${dateStr}|${r.studentId}`, r.status);
        }
      });
    } else if (doc.studentId && doc.status) {
      map.set(`${dateStr}|${doc.studentId}`, doc.status);
    }
  });
  return map;
}

// ======================== BUILD EXCEL SHEET ========================

function applyHeaderStyle(cell) {
  cell.font = { name: 'Arial', size: 10, bold: true };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
}

function applyDataStyle(cell, centered = false) {
  cell.font = { name: 'Arial', size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: centered ? 'center' : 'left' };
  cell.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
}

const STATUS_CODE = { hadir: 'H', izin: 'I', sakit: 'S', alpa: 'A' };

function buildAttendanceSheet(workbook, sheetName, title, monthLabel, daysInMonth, people, attendanceMap, selectedMonth) {
  const sheet = workbook.addWorksheet(sheetName);

  // Column widths
  const cols = [{ width: 5 }, { width: 30 }];
  for (let i = 0; i < daysInMonth; i++) cols.push({ width: 4 });
  sheet.columns = cols;

  // Row 1: Title
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  sheet.mergeCells(1, 1, 1, daysInMonth + 2);

  // Row 4: Bulan
  sheet.getCell('A4').value = 'Bulan :';
  sheet.getCell('A4').font = { name: 'Arial', size: 10 };
  sheet.getCell('C4').value = monthLabel;
  sheet.getCell('C4').font = { name: 'Arial', size: 10, bold: true };

  // Row 5: Header "No", "Nama", merged "Tanggal"
  const h5No = sheet.getCell('A5');
  h5No.value = 'No';
  applyHeaderStyle(h5No);
  const h5Name = sheet.getCell('B5');
  h5Name.value = sheetName.includes('Guru') ? 'Nama Guru' : 'Nama Siswa';
  applyHeaderStyle(h5Name);
  const h5Tgl = sheet.getCell(5, 3);
  h5Tgl.value = 'Tanggal';
  applyHeaderStyle(h5Tgl);
  if (daysInMonth > 1) sheet.mergeCells(5, 3, 5, daysInMonth + 2);

  // Row 6: "No", "Nama", 1..31
  const h6No = sheet.getCell('A6');
  h6No.value = 'No';
  applyHeaderStyle(h6No);
  const h6Name = sheet.getCell('B6');
  h6Name.value = sheetName.includes('Guru') ? 'Nama Guru' : 'Nama Siswa';
  applyHeaderStyle(h6Name);
  for (let d = 1; d <= daysInMonth; d++) {
    const c = sheet.getCell(6, d + 2);
    c.value = d;
    applyHeaderStyle(c);
  }

  // Merge header cells
  sheet.mergeCells('A5', 'A6');
  sheet.mergeCells('B5', 'B6');

  // Data rows starting from row 7
  people.forEach((person, idx) => {
    const rowNum = idx + 7;
    const row = sheet.getRow(rowNum);

    const cNo = row.getCell(1);
    cNo.value = idx + 1;
    applyDataStyle(cNo, true);

    const cName = row.getCell(2);
    cName.value = person.name || '-';
    applyDataStyle(cName);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const key = `${dateStr}|${person.id}`;
      const status = attendanceMap.get(key);
      const c = row.getCell(day + 2);
      c.value = status ? (STATUS_CODE[status.toLowerCase()] || '') : '';
      applyDataStyle(c, true);
    }
  });

  return sheet;
}

export default function Laporan() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedReport, setSelectedReport] = useState('kehadiran-siswa');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getSubjects().then(setSubjects).catch(console.error);
    getClasses().then(setClasses).catch(console.error);
  }, []);

  // ======================== REKAP KEHADIRAN SISWA ========================
  async function handleSiswaExcel() {
    if (!selectedClass) {
      alert('Silakan pilih kelas terlebih dahulu.');
      return;
    }
    try {
      setDownloading(true);
      const daysInMonth = getDaysInMonth(selectedMonth);
      const monthLabel = getMonthLabel(selectedMonth);
      const className = classes.find(c => c.id === selectedClass)?.name || '';

      const [allStudents, allDailyAttendances] = await Promise.all([
        getStudents(),
        getAllDailyAttendances()
      ]);

      const students = allStudents.filter(s => s.classId === selectedClass);
      const attendanceMap = flattenAttendance(allDailyAttendances, selectedMonth);

      const workbook = new ExcelJS.Workbook();
      buildAttendanceSheet(workbook, 'Rekap Siswa', `Rekap Presensi Siswa - ${className}`, monthLabel, daysInMonth, students, attendanceMap, selectedMonth);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Rekap_Kehadiran_Siswa_${className}_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Excel error:', err);
      alert('Gagal membuat laporan: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  // ======================== REKAP KEHADIRAN GURU ========================
  async function handleGuruExcel() {
    try {
      setDownloading(true);
      const daysInMonth = getDaysInMonth(selectedMonth);
      const monthLabel = getMonthLabel(selectedMonth);

      const [teachers, allTeacherAttendances] = await Promise.all([
        getTeachers(),
        getAllTeacherAttendances()
      ]);

      const guruMap = new Map();
      allTeacherAttendances.forEach(doc => {
        const dateStr = normalizeDate(doc.date);
        if (!dateStr || !dateStr.startsWith(selectedMonth)) return;
        
        if (doc.records && Array.isArray(doc.records)) {
          doc.records.forEach(r => {
            if (r.teacherId && r.status) {
              guruMap.set(`${dateStr}|${r.teacherId}`, r.status);
            }
          });
        }
      });

      const workbook = new ExcelJS.Workbook();
      buildAttendanceSheet(workbook, 'Rekap Guru', 'Rekap Presensi Guru', monthLabel, daysInMonth, teachers, guruMap, selectedMonth);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Rekap_Kehadiran_Guru_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Excel error:', err);
      alert('Gagal membuat laporan: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  // ======================== REKAP ABSENSI PER MAPEL ========================
  async function handleMapelExcel() {
    try {
      setDownloading(true);
      const daysInMonth = getDaysInMonth(selectedMonth);
      const monthLabel = getMonthLabel(selectedMonth);

      const [allStudents, allAttendances] = await Promise.all([
        getStudents(),
        getAllAttendances()
      ]);

      const subjectName = selectedMapel
        ? subjects.find(s => s.id === selectedMapel)?.name || 'Mapel'
        : 'Semua Mapel';

      // Filter by subjectId if selected
      let filteredDocs = allAttendances;
      if (selectedMapel) {
        filteredDocs = filteredDocs.filter(a => a.subjectId === selectedMapel);
      }

      const attendanceMap = flattenAttendance(filteredDocs, selectedMonth);

      const workbook = new ExcelJS.Workbook();
      buildAttendanceSheet(workbook, 'Rekap Mapel', `Rekap Absensi - ${subjectName}`, monthLabel, daysInMonth, allStudents, attendanceMap, selectedMonth);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Rekap_Absensi_${subjectName}_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Excel error:', err);
      alert('Gagal membuat laporan: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  // ======================== REKAP JURNAL - CETAK PDF ========================
  async function handleJurnalPDF() {
    try {
      setDownloading(true);
      const monthLabel = getMonthLabel(selectedMonth);

      const [journals, teachers, classesList, subjectsList] = await Promise.all([
        getJournals(),
        getTeachers(),
        getClasses(),
        getSubjects()
      ]);

      const getName = (arr, id) => arr.find(x => x.id === id)?.name || '-';

      const monthJournals = journals.filter(j => {
        const nd = normalizeDate(j.date);
        return nd && nd.startsWith(selectedMonth);
      }).sort((a, b) => {
        const da = normalizeDate(a.date) || '';
        const db = normalizeDate(b.date) || '';
        return da.localeCompare(db);
      });

      const printContent = `
        <html>
        <head>
          <title>Log Aktivitas Jurnal Mengajar - ${monthLabel}</title>
          <style>
            @page { size: landscape; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
            h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
            h2 { font-size: 12px; text-align: center; font-weight: normal; color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background: #f8f9fa; font-weight: bold; text-align: left; text-transform: uppercase; font-size: 10px; color: #555; }
            td.center { text-align: center; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-jp { background: #e3f2fd; color: #1976d2; }
            .badge-piket { background: #fff3e0; color: #f57c00; border: 1px solid #ffe0b2; }
            .badge-verified { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
            .badge-belum { background: #f5f5f5; color: #616161; border: 1px solid #e0e0e0; }
            .footer { margin-top: 16px; font-size: 10px; color: #777; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Log Aktivitas Jurnal Mengajar</h1>
          <h2>SMP Plus Darul Falah — Periode ${monthLabel}</h2>
          <table>
            <thead>
              <tr>
                <th style="width:30px; text-align:center;">No</th>
                <th style="width:90px">Tanggal</th>
                <th>Guru</th>
                <th>Kelas</th>
                <th>Mata Pelajaran</th>
                <th>Ringkasan Materi</th>
                <th style="width:60px; text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${monthJournals.length === 0
                ? '<tr><td colspan="7" class="center" style="padding:20px;color:#999">Tidak ada data jurnal untuk bulan ini.</td></tr>'
                : monthJournals.map((j, i) => {
                    const dateFormatted = normalizeDate(j.date) ? new Date(normalizeDate(j.date)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                    const isPiket = j.tipeKegiatan === 'piket';
                    const jpText = (j.jamPelajaran || j.jp) ? (j.jamPelajaran || j.jp) + ' JP' : '1 JP';
                    return `
                      <tr>
                        <td class="center">${i + 1}</td>
                        <td>${dateFormatted}</td>
                        <td>${j.teacherName || getName(teachers, j.teacherId)}</td>
                        <td>${isPiket ? 'Semua Kelas' : getName(classesList, j.classId)}</td>
                        <td>
                          ${isPiket 
                              ? '<span class="badge badge-piket">Guru Piket</span>' 
                              : getName(subjectsList, j.subjectId)}
                        </td>
                        <td>
                          <span class="badge badge-jp">${jpText}</span>
                          ${j.material || j.materi || '-'}
                        </td>
                        <td class="center">
                          ${j.verified 
                              ? '<span class="badge badge-verified">Verified</span>' 
                              : '<span class="badge badge-belum">Belum</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')
              }
            </tbody>
          </table>
          <div class="footer">Total: ${monthJournals.length} entri — Dicetak pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch (err) {
      console.error('PDF error:', err);
      alert('Gagal mencetak jurnal: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  // ======================== MAIN HANDLER ========================
  async function handleAction() {
    if (selectedReport === 'kehadiran-siswa') return handleSiswaExcel();
    if (selectedReport === 'kehadiran-guru') return handleGuruExcel();
    if (selectedReport === 'absensi-mapel') return handleMapelExcel();
    if (selectedReport === 'jurnal-mengajar') return handleJurnalPDF();
  }

  function getActionLabel() {
    if (downloading) return 'Memproses...';
    if (selectedReport === 'jurnal-mengajar') return 'Cetak PDF';
    return 'Buat Laporan Excel';
  }

  function getActionIcon() {
    if (downloading) return 'progress_activity';
    if (selectedReport === 'jurnal-mengajar') return 'print';
    return 'download';
  }

  const reportTypes = [
    { id: 'kehadiran-siswa', label: 'Rekap Kehadiran Siswa', icon: 'groups', description: 'Mengisi template rekap kehadiran siswa (H/I/S/A) per kelas per bulan.' },
    { id: 'kehadiran-guru', label: 'Rekap Kehadiran Guru', icon: 'badge', description: 'Mengisi template rekap kehadiran guru (H/I/S/A) per bulan.' },
    { id: 'absensi-mapel', label: 'Rekap Absensi per Mapel', icon: 'menu_book', description: 'Rekap absensi yang dikelompokkan berdasarkan mata pelajaran.', needsMapel: true },
    { id: 'jurnal-mengajar', label: 'Rekap Jurnal Mengajar', icon: 'edit_note', description: 'Cetak rekap jurnal mengajar guru dalam format PDF.' },
  ];

  const currentReport = reportTypes.find(r => r.id === selectedReport);

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto w-full pb-xl print:pb-0">
      {/* Page Header */}
      <div className="mb-lg print:hidden">
        <h2 className="font-h2 text-h2 text-on-surface mb-xs">Konfigurasi Laporan</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Pilih jenis laporan, atur filter, lalu buat laporan otomatis.</p>
      </div>

      {/* Filter Waktu (Bulan) & Kelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg print:hidden">
        <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm">
          <label className="block font-label-sm text-label-sm text-on-surface mb-2">Filter Periode Bulan</label>
          <div className="relative w-full">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            />
          </div>
        </div>

        {selectedReport === 'kehadiran-siswa' && (
          <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm">
            <label className="block font-label-sm text-label-sm text-on-surface mb-2">Pilih Kelas</label>
            <div className="relative w-full">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2.5 pl-4 pr-10 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
            </div>
          </div>
        )}
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg print:hidden">
        {reportTypes.map(r => (
          <button key={r.id} onClick={() => { setSelectedReport(r.id); setSelectedMapel(''); }} className={`bg-surface-container-lowest rounded-xl p-md border shadow-sm text-left transition-all duration-200 hover:shadow-md group ${selectedReport === r.id ? 'border-primary ring-1 ring-primary' : 'border-surface-variant hover:border-primary/30'}`}>
            <div className="flex items-start gap-sm">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${selectedReport === r.id ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'} transition-colors`}>
                <span className="material-symbols-outlined text-2xl">{r.icon}</span>
              </div>
              <div>
                <h3 className={`font-h3 text-base mb-1 ${selectedReport === r.id ? 'text-primary' : 'text-on-surface'}`}>{r.label}</h3>
                <p className="font-caption text-caption text-on-surface-variant">{r.description}</p>
              </div>
            </div>
            {selectedReport === r.id && (
              <div className="mt-3 flex items-center gap-1 text-primary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Terpilih
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Mapel Selector for absensi-mapel */}
      {currentReport?.needsMapel && (
        <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm mb-lg print:hidden">
          <label className="block font-label-sm text-label-sm text-on-surface mb-2">Pilih Mata Pelajaran</label>
          <div className="relative max-w-md">
            <select value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2.5 pl-4 pr-10 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer">
              <option value="">Semua Mata Pelajaran</option>
              {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-h3 text-base text-on-surface mb-1">Aksi: {currentReport?.label}</h3>
            <p className="font-caption text-caption text-on-surface-variant">
              {selectedReport === 'jurnal-mengajar'
                ? 'Cetak rekap jurnal mengajar dalam format PDF.'
                : 'Buat file Excel (.xlsx) dengan data kehadiran terbaru dari database.'}
            </p>
          </div>
          <button onClick={handleAction} disabled={downloading} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm shrink-0">
            <span className={`material-symbols-outlined text-[18px] ${downloading ? 'animate-spin' : ''}`}>{getActionIcon()}</span>
            {getActionLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
