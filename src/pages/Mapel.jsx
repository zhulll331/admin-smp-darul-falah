import React, { useState, useEffect } from 'react';
import { getSubjects, addSubject, updateSubject, deleteSubject, getTeachers, getInitials, syncSubjectTeachers } from '../services/firestoreService';
import Modal from '../components/Modal';
import { CardSkeleton } from '../components/LoadingSkeleton';

const emptyForm = { name: '', category: 'Mapel Inti', grades: ['7','8','9'], hoursPerWeek: 4, coordinatorId: '', teacherIds: [], isActive: true };
const icons = { 'Matematika': 'calculate', 'Biologi': 'biotech', 'Fisika': 'science', 'Kimia': 'science', 'IPA': 'biotech', 'IPS': 'public', 'Bahasa Indonesia': 'translate', 'Bahasa Inggris': 'language', 'Sejarah': 'history_edu', 'PKn': 'gavel', 'Seni Budaya': 'palette', 'Penjaskes': 'sports_soccer', 'Agama': 'mosque', 'TIK': 'computer' };
const categoryColors = ['bg-tertiary-container/20 text-tertiary-container', 'bg-secondary-container/20 text-secondary-container', 'bg-primary-container/20 text-primary-container'];

export default function Mapel() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [oldTeacherIds, setOldTeacherIds] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([getSubjects(), getTeachers()]);
      setSubjects(s);
      setTeachers(t);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getTeacherName(id) { return teachers.find(t => t.id === id)?.name || ''; }
  function getIcon(name) { for (const [key, val] of Object.entries(icons)) { if (name?.toLowerCase().includes(key.toLowerCase())) return val; } return 'menu_book'; }

  function openAdd() { setEditId(null); setForm(emptyForm); setOldTeacherIds([]); setShowModal(true); }
  function openEdit(s) {
    setEditId(s.id);
    const currentTeacherIds = s.teacherIds || [];
    setForm({ name: s.name||'', category: s.category||'', grades: s.grades||['7','8','9'], hoursPerWeek: s.hoursPerWeek||4, coordinatorId: s.coordinatorId||'', teacherIds: [...currentTeacherIds], isActive: s.isActive !== false });
    setOldTeacherIds([...currentTeacherIds]);
    setShowModal(true); setMenuOpen(null);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Nama mapel wajib diisi');
    setSaving(true);
    try {
      if (editId) {
        await updateSubject(editId, form);
        // Sync: update subjectIds on all affected teacher documents
        await syncSubjectTeachers(editId, form.teacherIds || [], oldTeacherIds);
      } else {
        const docRef = await addSubject(form);
        // Sync: add this new subject to all assigned teacher documents
        if (form.teacherIds?.length > 0) {
          await syncSubjectTeachers(docRef.id, form.teacherIds, []);
        }
      }
      setShowModal(false); await loadData();
    } catch (err) { console.error(err); alert('Gagal menyimpan.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus mapel ini?')) return;
    try { await deleteSubject(id); await loadData(); } catch (err) { console.error(err); }
    setMenuOpen(null);
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-h2 text-h2 text-on-background mb-xs">Manajemen Mata Pelajaran</h2>
          <p className="font-body-md text-body-md text-outline">Tinjauan dan konfigurasi kurikulum mata pelajaran.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={openAdd} className="flex items-center gap-xs px-md py-sm rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm shadow-sm hover:bg-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Mapel
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? <CardSkeleton count={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {subjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl block mb-2 text-outline">menu_book</span>
              <p className="font-body-md">Belum ada data mata pelajaran.</p>
            </div>
          )}
          {subjects.map((s, idx) => {
            const coordName = getTeacherName(s.coordinatorId);
            return (
              <div key={s.id} className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-md">
                  <div className="flex items-center gap-sm">
                    <div className={`w-12 h-12 rounded-lg ${categoryColors[idx % 3]} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[28px]">{getIcon(s.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-h3 text-h3 text-on-surface">{s.name}</h3>
                      <span className="inline-block mt-xs px-2 py-1 bg-surface-container rounded font-caption text-caption text-outline">{s.category || '-'}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)} className="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {menuOpen === s.id && (
                      <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest rounded-lg shadow-lg border border-surface-variant py-1 z-50 w-32 animate-in fade-in zoom-in-95 duration-150">
                        <button onClick={() => openEdit(s)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-container-low flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">edit</span>Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error-container/20 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">delete</span>Hapus</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-sm">
                    <p className="font-caption text-caption text-outline mb-xs">Tingkat Kelas</p>
                    <div className="flex flex-wrap gap-xs">
                      {(s.grades || []).map(g => (
                        <span key={g} className="px-2 py-1 rounded-full border border-outline-variant font-caption text-caption text-on-surface-variant">Kelas {g}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-sm text-on-surface-variant font-caption text-caption mb-sm">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    {s.hoursPerWeek || 0} Jam / Minggu
                  </div>
                  <div className="pt-sm border-t border-surface-container-high">
                    <p className="font-caption text-caption text-outline mb-xs">Guru Pengampu ({s.teacherIds?.length || 0})</p>
                    <div className="flex flex-wrap gap-1">
                      {(s.teacherIds || []).map(tId => (
                        <span key={tId} className="px-2 py-0.5 rounded-full bg-surface-container-highest font-caption text-[11px] text-on-surface-variant border border-outline-variant/30">
                          {getTeacherName(tId)}
                        </span>
                      ))}
                      {(!s.teacherIds || s.teacherIds.length === 0) && (
                        <span className="font-caption text-[11px] text-outline italic">Belum ada guru ditugaskan</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-md pt-sm border-t border-surface-container-high flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    {coordName ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-label-sm text-on-surface">{getInitials(coordName)}</div>
                        <div>
                          <p className="font-label-sm text-label-sm text-on-surface leading-tight">{coordName}</p>
                          <p className="font-caption text-caption text-outline">Koordinator</p>
                        </div>
                      </>
                    ) : (
                      <p className="font-caption text-caption text-outline">Belum ada koordinator</p>
                    )}
                  </div>
                  <span className={`font-caption text-caption font-medium px-2 py-1 rounded ${s.isActive !== false ? 'text-primary bg-primary-container/10' : 'text-error bg-error-container/10'}`}>
                    {s.isActive !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Mapel' : 'Tambah Mapel Baru'} icon="menu_book">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Nama Mata Pelajaran *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md" placeholder="Contoh: Matematika" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">Kategori</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md cursor-pointer">
                <option>Mapel Inti</option>
                <option>IPA</option>
                <option>IPS</option>
                <option>Bahasa</option>
                <option>Agama</option>
                <option>Ekstrakurikuler</option>
              </select>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">Jam / Minggu</label>
              <input type="number" value={form.hoursPerWeek} onChange={e => setForm({...form, hoursPerWeek: Number(e.target.value)})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md" />
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Koordinator</label>
            <select value={form.coordinatorId} onChange={e => setForm({...form, coordinatorId: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-md font-body-md cursor-pointer">
              <option value="">Pilih Koordinator...</option>
              {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-2">Pilih Guru Pengampu</label>
            <div className="bg-surface border border-outline-variant rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
              {teachers.length === 0 ? (
                <p className="text-caption text-outline text-center py-2">Belum ada guru</p>
              ) : (
                teachers.map(t => (
                  <label key={t.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-surface-container-lowest px-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={(form.teacherIds || []).includes(t.id)}
                      onChange={() => {
                        const current = form.teacherIds || [];
                        setForm({
                          ...form,
                          teacherIds: current.includes(t.id) ? current.filter(id => id !== t.id) : [...current, t.id]
                        });
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-body-md text-sm text-on-surface">{t.name}</span>
                      {t.nip && <span className="font-caption text-[11px] text-outline">{t.nip}</span>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {editId ? 'Simpan' : 'Tambah Mapel'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
