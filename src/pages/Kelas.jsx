import React, { useState, useEffect } from 'react';
import { getClasses, addClass, updateClass, deleteClass, getTeachers, getStudents, getInitials } from '../services/firestoreService';
import Modal from '../components/Modal';
import { CardSkeleton } from '../components/LoadingSkeleton';

const emptyForm = { name: '', grade: '7', program: 'IPA', capacity: 35, waliId: '' };

export default function Kelas() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, t, s] = await Promise.all([getClasses(), getTeachers(), getStudents()]);
      setClasses(c);
      setTeachers(t);
      setStudents(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getTeacherName(id) { return teachers.find(t => t.id === id)?.name || ''; }
  function getStudentCount(classId) { return students.filter(s => s.classId === classId).length; }

  function openAdd() { setEditId(null); setForm(emptyForm); setShowModal(true); }

  function openEdit(c) {
    setEditId(c.id);
    setForm({ name: c.name||'', grade: c.grade||'7', program: c.program||'', capacity: c.capacity||35, waliId: c.waliId||'' });
    setShowModal(true);
    setMenuOpen(null);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Nama kelas wajib diisi');
    setSaving(true);
    try {
      if (editId) await updateClass(editId, form);
      else await addClass(form);
      setShowModal(false);
      await loadData();
    } catch (err) { console.error(err); alert('Gagal menyimpan.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return;
    try { await deleteClass(id); await loadData(); } catch (err) { console.error(err); }
    setMenuOpen(null);
  }

  const filtered = classes.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || c.grade === filterGrade;
    return matchSearch && matchGrade;
  });

  const totalStudents = students.length;
  const assignedWali = classes.filter(c => c.waliId).length;
  const gradientColors = ['from-primary to-primary-container', 'from-tertiary to-tertiary-container', 'from-secondary to-secondary-container'];
  const badgeColors = ['bg-primary-container/20 text-on-primary-container', 'bg-tertiary-container/20 text-on-tertiary-container', 'bg-secondary-container/20 text-on-secondary-container'];
  const avatarColors = ['bg-primary-container text-on-primary-container', 'bg-tertiary-container text-on-tertiary-container', 'bg-secondary-container text-on-secondary-container'];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface mb-1">Manajemen Kelas</h2>
          <p className="font-body-md text-body-md text-outline">Kelola jadwal kelas, tugaskan wali kelas, dan pantau kapasitas siswa.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-6 py-3 rounded-lg font-label-sm text-label-sm shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Tambah Kelas
        </button>
      </div>

      {/* Stats */}
      {loading ? <CardSkeleton count={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
          <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-container/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>meeting_room</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-outline mb-1">Total Kelas</p>
                <h3 className="font-h1 text-h1 text-on-surface">{classes.length}</h3>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-tertiary-container/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-outline mb-1">Total Siswa</p>
                <h3 className="font-h1 text-h1 text-on-surface">{totalStudents.toLocaleString('id-ID')}</h3>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-secondary-container/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_apron</span>
              </div>
              <div>
                <p className="font-label-sm text-label-sm text-outline mb-1">Wali Kelas</p>
                <h3 className="font-h1 text-h1 text-on-surface">{assignedWali}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-2">
          {['', '7', '8', '9'].map(g => (
            <button key={g} onClick={() => setFilterGrade(g)} className={`px-4 py-2 rounded-full font-label-sm text-label-sm border transition-colors ${filterGrade === g ? 'bg-primary-container/20 text-on-primary-container border-primary-container/30' : 'bg-surface-container-lowest text-outline border-surface-variant hover:bg-surface-container-low'}`}>
              {g === '' ? 'Semua Tingkat' : `Kelas ${g}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md" placeholder="Cari kelas..." type="text" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? <CardSkeleton count={4} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl block mb-2 text-outline">meeting_room</span>
              <p className="font-body-md">{search ? 'Tidak ditemukan.' : 'Belum ada data kelas.'}</p>
            </div>
          )}
          {filtered.map((c, idx) => {
            const count = getStudentCount(c.id);
            const cap = c.capacity || 35;
            const pct = Math.min(Math.round((count / cap) * 100), 100);
            const waliName = getTeacherName(c.waliId);
            return (
              <div key={c.id} className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group cursor-pointer transform hover:-translate-y-1">
                <div className={`h-2 w-full bg-gradient-to-r ${gradientColors[idx % 3]} rounded-t-xl`}></div>
                <div className="p-md flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${badgeColors[idx % 3]} mb-2`}>{c.program || '-'}</span>
                      <h3 className="font-h3 text-h3 text-on-surface">{c.name}</h3>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)} className="text-outline hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      {menuOpen === c.id && (
                        <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest rounded-lg shadow-lg border border-surface-variant py-1 z-50 w-32 animate-in fade-in zoom-in-95 duration-150">
                          <button onClick={() => openEdit(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-container-low flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">edit</span>Edit</button>
                          <button onClick={() => handleDelete(c.id)} className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error-container/20 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">delete</span>Hapus</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {waliName ? (
                        <>
                          <div className={`w-10 h-10 rounded-full ${avatarColors[idx % 3]} flex items-center justify-center font-bold text-sm shadow-sm`}>{getInitials(waliName)}</div>
                          <div>
                            <p className="font-caption text-caption text-outline">Wali Kelas</p>
                            <p className="font-label-sm text-label-sm text-on-surface">{waliName}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-outline shadow-sm"><span className="material-symbols-outlined text-xl">person_off</span></div>
                          <div>
                            <p className="font-caption text-caption text-error">Belum Ditugaskan</p>
                            <p className="font-label-sm text-label-sm text-on-surface">Menunggu Penugasan</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-3 border-t border-surface-variant">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-sm">group</span>
                        <span className="font-caption text-caption text-outline">Siswa</span>
                      </div>
                      <span className={`font-label-sm text-label-sm ${pct >= 100 ? 'text-error' : 'text-on-surface'}`}>{count} / {cap}</span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-1.5 mt-2">
                      <div className={`${pct >= 100 ? 'bg-error' : pct >= 90 ? 'bg-secondary' : 'bg-primary-container'} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-8">
        <p className="font-caption text-caption text-outline">Menampilkan {filtered.length} dari {classes.length} kelas</p>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Kelas' : 'Tambah Kelas Baru'} icon="meeting_room">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Nama Kelas *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="Contoh: 7-A" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">Tingkat</label>
              <select value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md cursor-pointer">
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">Program/Jurusan</label>
              <input value={form.program} onChange={e => setForm({...form, program: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md" placeholder="IPA / IPS / Umum" />
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Kapasitas</label>
            <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md" />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Wali Kelas</label>
            <select value={form.waliId} onChange={e => setForm({...form, waliId: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md cursor-pointer">
              <option value="">Pilih Wali Kelas...</option>
              {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {editId ? 'Simpan' : 'Tambah Kelas'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
