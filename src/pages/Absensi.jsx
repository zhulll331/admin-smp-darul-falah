import React, { useState, useEffect } from 'react';
import { 
  getStudents, getClasses, getSubjects, getTeachers,
  getDailyAttendanceByDate, saveDailyAttendance,
  getTeacherAttendanceByDate, saveTeacherAttendance,
  getInitials 
} from '../services/firestoreService';
import { TableSkeleton } from '../components/LoadingSkeleton';

export default function Absensi() {
  const [activeTab, setActiveTab] = useState('siswa'); // 'siswa' or 'guru'
  
  // Data States
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // Selection States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Attendance Maps
  const [attendanceMap, setAttendanceMap] = useState({});
  const [teacherAttendanceMap, setTeacherAttendanceMap] = useState({});
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([getClasses(), getTeachers()]);
      setClasses(c);
      setTeachers(t);
      if (c.length > 0) setSelectedClassId(c[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Load when date or class changes (Siswa)
  useEffect(() => {
    if (activeTab === 'siswa' && selectedClassId) {
      loadClassStudents();
    } else if (activeTab === 'guru') {
      loadTeachersAttendance();
    }
  }, [selectedClassId, selectedDate, activeTab]);

  async function loadClassStudents() {
    try {
      const allStudents = await getStudents();
      const classStudents = allStudents.filter(s => s.classId === selectedClassId);
      setStudents(classStudents);
      
      const existing = await getDailyAttendanceByDate(selectedDate);
      const map = {};
      existing.records.forEach(r => { map[r.studentId] = r.status.toLowerCase(); });
      setAttendanceMap(map);
      setSaved(false);
    } catch (err) { console.error(err); }
  }

  async function loadTeachersAttendance() {
    try {
      const existing = await getTeacherAttendanceByDate(selectedDate);
      const map = {};
      existing.records.forEach(r => { map[r.teacherId] = r.status.toLowerCase(); });
      setTeacherAttendanceMap(map);
      setSaved(false);
    } catch (err) { console.error(err); }
  }

  function setStatusSiswa(studentId, status) {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  function setStatusGuru(teacherId, status) {
    setTeacherAttendanceMap(prev => ({ ...prev, [teacherId]: status }));
    setSaved(false);
  }

  async function handleSaveSiswa() {
    setSaving(true);
    try {
      const currentDaily = await getDailyAttendanceByDate(selectedDate);
      
      const newClassRecords = students
        .filter(s => attendanceMap[s.id])
        .map(s => ({
          studentId: s.id,
          status: attendanceMap[s.id]
        }));
        
      if (newClassRecords.length === 0) {
        alert('Belum ada absensi yang dipilih.');
        setSaving(false);
        return;
      }

      let mergedRecords = currentDaily.records || [];
      const currentStudentIds = new Set(students.map(s => s.id));
      mergedRecords = mergedRecords.filter(r => !currentStudentIds.has(r.studentId));
      mergedRecords = [...mergedRecords, ...newClassRecords];

      await saveDailyAttendance(selectedDate, mergedRecords, currentDaily.id);
      setSaved(true);
      alert('Absensi Siswa Tersimpan!');
      await loadClassStudents();
    } catch (err) { console.error(err); alert('Gagal menyimpan absensi.'); }
    finally { setSaving(false); }
  }

  async function handleSaveGuru() {
    setSaving(true);
    try {
      const currentDaily = await getTeacherAttendanceByDate(selectedDate);
      
      const records = teachers
        .filter(t => teacherAttendanceMap[t.id])
        .map(t => ({
          teacherId: t.id,
          status: teacherAttendanceMap[t.id]
        }));
        
      if (records.length === 0) {
        alert('Belum ada absensi yang dipilih.');
        setSaving(false);
        return;
      }

      await saveTeacherAttendance(selectedDate, records, currentDaily.id);
      setSaved(true);
      alert('Absensi Guru Tersimpan!');
      await loadTeachersAttendance();
    } catch (err) { console.error(err); alert('Gagal menyimpan absensi.'); }
    finally { setSaving(false); }
  }

  const statusList = ['hadir', 'sakit', 'izin', 'alpa'];
  const statusStyles = {
    hadir: { active: 'bg-surface-container-lowest shadow-sm text-primary', dot: 'bg-primary' },
    sakit: { active: 'bg-surface-container-lowest shadow-sm text-secondary', dot: 'bg-secondary' },
    izin: { active: 'bg-surface-container-lowest shadow-sm text-tertiary', dot: 'bg-tertiary' },
    alpa: { active: 'bg-surface-container-lowest shadow-sm text-error', dot: 'bg-error' },
  };
  const statusNames = { hadir: 'Hadir', sakit: 'Sakit', izin: 'Izin', alpa: 'Alpa' };

  // Calculate Stats
  const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
  if (activeTab === 'siswa') {
    students.forEach(s => {
      const st = attendanceMap[s.id];
      if (st && counts[st] !== undefined) counts[st]++;
    });
  } else {
    teachers.forEach(t => {
      const st = teacherAttendanceMap[t.id];
      if (st && counts[st] !== undefined) counts[st]++;
    });
  }

  const statCards = [
    { key: 'hadir', icon: 'how_to_reg', bg: 'bg-primary/5', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
    { key: 'sakit', icon: 'local_hospital', bg: 'bg-secondary-container/20', iconBg: 'bg-secondary-container/30', iconColor: 'text-secondary' },
    { key: 'izin', icon: 'edit_document', bg: 'bg-tertiary-container/20', iconBg: 'bg-tertiary-container/30', iconColor: 'text-tertiary' },
    { key: 'alpa', icon: 'person_off', bg: 'bg-error-container/40', iconBg: 'bg-error-container', iconColor: 'text-error' },
  ];

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || '';

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <h2 className="text-h2 font-h2 text-on-surface mb-2">Pencatatan Absensi</h2>
          <p className="text-body-md font-body-md text-on-surface-variant">Monitoring kehadiran harian yang diinput oleh Guru Piket.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-label-sm text-on-surface-variant px-1">Tanggal</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl">calendar_month</span>
              <input className="pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          </div>
          {activeTab === 'siswa' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-label-sm text-on-surface-variant px-1">Kelas</label>
              <div className="relative min-w-[200px]">
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer">
                  {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-8 bg-surface-container-low p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('siswa')}
          className={`px-6 py-2.5 rounded-lg text-label-md font-label-md transition-all ${activeTab === 'siswa' ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Absensi Siswa
        </button>
        <button 
          onClick={() => setActiveTab('guru')}
          className={`px-6 py-2.5 rounded-lg text-label-md font-label-md transition-all ${activeTab === 'guru' ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Absensi Guru
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {statCards.map(sc => (
          <div key={sc.key} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/50 relative overflow-hidden group">
            <div className={`absolute right-0 top-0 w-24 h-24 ${sc.bg} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`w-10 h-10 rounded-full ${sc.iconBg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${sc.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{sc.icon}</span>
              </div>
              <span className="text-h3 font-h3 text-on-surface">{counts[sc.key]}</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant relative z-10 uppercase tracking-wider">{statusNames[sc.key]}</h3>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low/50 border-b border-outline-variant/50">
          <div className="col-span-4 text-label-sm font-label-sm text-on-surface-variant">{activeTab === 'siswa' ? 'Siswa' : 'Guru'}</div>
          <div className="col-span-8 text-label-sm font-label-sm text-on-surface-variant">Status Kehadiran</div>
        </div>

        <div className="flex flex-col divide-y divide-outline-variant/30">
          {(activeTab === 'siswa' ? students : teachers).length === 0 && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mb-2 text-outline">group_off</span>
              <p className="font-body-md">Tidak ada data untuk ditampilkan.</p>
            </div>
          )}
          
          {(activeTab === 'siswa' ? students : teachers).map(item => {
            const currentStatus = activeTab === 'siswa' ? attendanceMap[item.id] : teacherAttendanceMap[item.id];
            const rowBg = currentStatus === 'sakit' ? 'bg-secondary-container/5' : currentStatus === 'alpa' ? 'bg-error-container/10' : currentStatus === 'izin' ? 'bg-tertiary-container/5' : '';
            const textStyle = currentStatus && statusStyles[currentStatus]?.active ? statusStyles[currentStatus].active.split(' ').find(c => c.startsWith('text-')) : 'text-on-surface-variant';
            
            return (
              <div key={item.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-container-lowest/80 transition-colors ${rowBg}`}>
                <div className="col-span-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-sm ${textStyle}`}>
                    {getInitials(item.name)}
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface font-medium">{item.name}</p>
                    {activeTab === 'siswa' ? (
                      <p className="text-caption font-caption text-on-surface-variant">NIS: {item.nis || '-'}</p>
                    ) : (
                      <p className="text-caption font-caption text-on-surface-variant">NIP: {item.nip || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-8">
                  <div className="inline-flex rounded-full bg-surface-container p-1 shadow-inner">
                    {statusList.map(st => (
                      <button key={st} onClick={() => activeTab === 'siswa' ? setStatusSiswa(item.id, st) : setStatusGuru(item.id, st)} className={`rounded-full px-5 py-1.5 text-label-sm font-label-sm transition-all flex items-center gap-1.5 ${currentStatus === st ? statusStyles[st].active : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}>
                        {currentStatus === st && <span className={`w-2 h-2 rounded-full ${statusStyles[st].dot}`}></span>}
                        {statusNames[st]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="bg-surface-container-low px-6 py-4 border-t border-outline-variant/50 flex justify-between items-center">
          <p className="text-caption font-caption text-on-surface-variant">
            {activeTab === 'siswa' ? `${students.length} siswa di ${selectedClassName}` : `${teachers.length} guru terdaftar`}
            {saved && <span className="text-primary ml-2 font-medium">✓ Tersimpan</span>}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              if (activeTab === 'siswa') {
                const newMap = { ...attendanceMap };
                students.forEach(s => { if (!newMap[s.id]) newMap[s.id] = 'hadir'; });
                setAttendanceMap(newMap);
              } else {
                const newMap = { ...teacherAttendanceMap };
                teachers.forEach(t => { if (!newMap[t.id]) newMap[t.id] = 'hadir'; });
                setTeacherAttendanceMap(newMap);
              }
              setSaved(false);
            }} className="text-primary hover:bg-primary-container/20 px-4 py-2 rounded-lg text-label-sm font-label-sm transition-colors flex items-center gap-2 disabled:opacity-50" disabled={saving || (activeTab === 'siswa' && students.length === 0) || (activeTab === 'guru' && teachers.length === 0)}>
              <span className="material-symbols-outlined text-[18px]">checklist</span>
              Tandai Semua Hadir
            </button>
            <button onClick={activeTab === 'siswa' ? handleSaveSiswa : handleSaveGuru} disabled={saving || (activeTab === 'siswa' && students.length === 0) || (activeTab === 'guru' && teachers.length === 0)} className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2 rounded-lg text-label-sm font-label-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
              {saving ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
