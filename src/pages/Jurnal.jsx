import React, { useState, useEffect } from 'react';
import { getJournals, deleteJournal, verifyJournal, getTeachers, getClasses, getSubjects, getInitials } from '../services/firestoreService';
import { TableSkeleton } from '../components/LoadingSkeleton';

export default function Jurnal() {
  const [journals, setJournals] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [j, t, c, s] = await Promise.all([getJournals(), getTeachers(), getClasses(), getSubjects()]);
      setJournals(j);
      setTeachers(t);
      setClasses(c);
      setSubjects(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getName(arr, id) { return arr.find(x => x.id === id)?.name || id || '-'; }

  function filterByPeriod(j) {
    if (!j.date) return true;
    let jDate = j.date;
    if (jDate && typeof jDate.toDate === 'function') {
      const dateObj = jDate.toDate();
      jDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    if (typeof jDate !== 'string') return true;
    
    const today = new Date().toISOString().split('T')[0];
    if (filterPeriod === 'today') return jDate === today;
    if (filterPeriod === 'week') {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return jDate >= weekAgo && jDate <= today;
    }
    if (filterPeriod === 'month') {
      return jDate.slice(0, 7) === selectedMonth;
    }
    return true;
  }

  let filtered = journals.filter(filterByPeriod);
  if (filterTeacher !== 'all') {
    filtered = filtered.filter(j => j.teacherId === filterTeacher);
  }
  
  filtered.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || 0;
    return bTime - aTime;
  });

  const totalToday = journals.filter(j => {
    let d = j.date;
    if (d && typeof d.toDate === 'function') {
      const dateObj = d.toDate();
      d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return d === new Date().toISOString().split('T')[0];
  }).length;
  const uniqueClasses = new Set(filtered.map(j => j.classId)).size;

  async function handleVerify(id) {
    try {
      await verifyJournal(id);
      await loadData();
    } catch (err) { console.error(err); alert('Gagal memverifikasi jurnal.'); }
  }

  const [verifyingAll, setVerifyingAll] = useState(false);
  async function handleVerifyAll() {
    const unverified = filtered.filter(j => !j.verified);
    if (unverified.length === 0) {
      alert('Semua jurnal yang ditampilkan sudah terverifikasi.');
      return;
    }
    if (!confirm(`Verifikasi ${unverified.length} jurnal sekaligus?`)) return;
    
    setVerifyingAll(true);
    try {
      await Promise.all(unverified.map(j => verifyJournal(j.id)));
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memverifikasi semua jurnal.');
    } finally {
      setVerifyingAll(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus entri jurnal ini?')) return;
    try { await deleteJournal(id); await loadData(); } catch (err) { console.error(err); }
  }

  const timelineColors = ['primary', 'tertiary', 'secondary'];

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="font-h2 text-h2 text-on-background">Jurnal Mengajar</h2>
          <p className="font-body-md text-body-md text-outline mt-2">Verifikasi dan pantau jurnal mengajar guru</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="appearance-none bg-surface-container-lowest border border-surface-variant rounded-lg py-2.5 pl-4 pr-10 font-label-sm text-label-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer shadow-sm">
              <option value="all">Semua Guru</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="flex items-center bg-surface-container-lowest rounded-lg p-1 border border-surface-variant shadow-sm">
            {[{key:'today',label:'Hari Ini'},{key:'week',label:'Minggu'},{key:'month',label:'Bulan'},{key:'all',label:'Semua'}].map(p => (
              <button key={p.key} onClick={() => setFilterPeriod(p.key)} className={`px-4 py-2 rounded-md font-label-sm text-label-sm transition-colors ${filterPeriod === p.key ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>{p.label}</button>
            ))}
          </div>
          {filterPeriod === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-surface-container-lowest border border-surface-variant rounded-lg py-2.5 px-4 font-label-sm text-label-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer shadow-sm"
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: 'Total Entri Hari Ini', value: totalToday, icon: 'library_books', color: 'primary' },
          { label: 'Kelas Terjangkau', value: uniqueClasses, icon: 'meeting_room', color: 'tertiary' },
          { label: 'Total Entri (filter)', value: filtered.length, icon: 'pending_actions', color: 'secondary' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-container-low relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${stat.color}-container/10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="font-label-sm text-label-sm text-outline mb-1">{stat.label}</p>
                <h3 className="font-h1 text-h1 text-on-background">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-full bg-${stat.color}-container/20 flex items-center justify-center text-${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-low overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-container-low flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-h3 text-h3 text-on-background text-xl">Log Aktivitas</h3>
          <div className="flex items-center gap-4">
            <span className="font-caption text-caption text-outline">{filtered.length} jurnal</span>
            {filtered.some(j => !j.verified) && (
              <button 
                onClick={handleVerifyAll} 
                disabled={verifyingAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all font-label-sm text-label-sm disabled:opacity-50"
              >
                {verifyingAll ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                )}
                Verifikasi Semua
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? <div className="p-6"><TableSkeleton rows={5} cols={7} /></div> : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-surface-variant">
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Guru</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Kelas</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Mata Pelajaran</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Ringkasan Materi</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-on-surface-variant font-body-md">
                      Belum ada entri jurnal.
                    </td>
                  </tr>
                ) : (
                  filtered.map(j => {
                    let d = j.date;
                    if (d && typeof d.toDate === 'function') {
                      d = new Date(d.toDate().getTime() - (d.toDate().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    }
                    const dateObj = d ? new Date(d) : new Date();
                    const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    const isPiket = j.tipeKegiatan === 'piket';
                    
                    return (
                      <tr key={j.id} className="border-b border-surface-variant last:border-0 hover:bg-surface-container-low/50 transition-colors">
                        <td className="px-6 py-4 font-body-md text-on-surface whitespace-nowrap">{dateFormatted}</td>
                        <td className="px-6 py-4 font-body-md text-on-surface">{j.teacherName || getName(teachers, j.teacherId)}</td>
                        <td className="px-6 py-4 font-body-md">
                          <span className={isPiket ? "text-secondary font-medium" : "text-tertiary"}>
                            {isPiket ? "Semua Kelas" : getName(classes, j.classId)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface">
                          {isPiket ? (
                            <span className="inline-flex items-center gap-1.5 text-primary">
                              <span className="material-symbols-outlined text-[16px]">security</span>
                              Guru Piket
                            </span>
                          ) : (
                            getName(subjects, j.subjectId)
                          )}
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded bg-primary-container/30 text-primary font-label-sm text-[11px] font-bold">
                              {j.jamPelajaran || j.jp || 1} JP
                            </span>
                            <span className="truncate max-w-[200px]" title={j.material || j.materi}>{j.material || j.materi}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {j.verified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-sm text-xs font-medium border border-primary/20">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-variant text-on-surface-variant font-label-sm text-xs font-medium">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => alert(j.catatan || j.notes ? 'Catatan: ' + (j.catatan || j.notes) : 'Tidak ada catatan tambahan')} className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary-container/20 transition-colors" title="Lihat Catatan">
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            {!j.verified ? (
                              <button onClick={() => handleVerify(j.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-xs hover:opacity-90 transition-opacity">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                Verifikasi
                              </button>
                            ) : (
                              <button onClick={() => handleDelete(j.id)} className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors" title="Hapus">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
