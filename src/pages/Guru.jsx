import React, { useState, useEffect } from 'react';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, getSubjects, getInitials, syncTeacherSubjects } from '../services/firestoreService';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const emptyForm = { name: '', email: '', nip: '', subjectIds: [], isActive: true };
const emptyOldSubjectIds = [];

export default function Guru() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [oldSubjectIds, setOldSubjectIds] = useState(emptyOldSubjectIds);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selected, setSelected] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importSubjectId, setImportSubjectId] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([getTeachers(), getSubjects()]);
      setTeachers(t);
      setSubjects(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setOldSubjectIds([]);
    setShowModal(true);
  }

  function openEdit(t) {
    setEditId(t.id);
    const currentSubjectIds = t.subjectIds || [];
    setForm({ name: t.name || '', email: t.email || '', nip: t.nip || '', subjectIds: currentSubjectIds, isActive: t.isActive !== false });
    setOldSubjectIds([...currentSubjectIds]);
    setShowModal(true);
    setMenuOpen(null);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Nama guru wajib diisi');
    setSaving(true);
    try {
      if (editId) {
        await updateTeacher(editId, form);
        // Sync: update teacherIds on all affected subject documents
        await syncTeacherSubjects(editId, form.subjectIds || [], oldSubjectIds);
      } else {
        const docRef = await addTeacher(form);
        // Sync: add this new teacher to all assigned subject documents
        if (form.subjectIds?.length > 0) {
          await syncTeacherSubjects(docRef.id, form.subjectIds, []);
        }
      }
      setShowModal(false);
      await loadData();
    } catch (err) { console.error(err); alert('Gagal menyimpan data.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus guru ini?')) return;
    try {
      await deleteTeacher(id);
      await loadData();
    } catch (err) { console.error(err); alert('Gagal menghapus.'); }
    setMenuOpen(null);
  }

  function getSubjectName(id) {
    const s = subjects.find(x => x.id === id);
    return s?.name || id;
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Hapus ${selected.length} guru terpilih?`)) return;
    try {
      await Promise.all(selected.map(id => deleteTeacher(id)));
      setSelected([]);
      await loadData();
    } catch (err) { console.error(err); }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(t => t.id));
  }

  async function handleDownloadTemplate() {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Data Guru');
      
      sheet.columns = [
        { header: 'Nama Lengkap', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'NIP', key: 'nip', width: 25 },
        { header: 'Status', key: 'status', width: 25 },
      ];

      sheet.getRow(1).font = { bold: true };

      if (selected.length > 0) {
        const selectedTeachers = teachers.filter(t => selected.includes(t.id));
        selectedTeachers.forEach(t => {
          sheet.addRow({
            name: t.name || '',
            email: t.email || '',
            nip: t.nip || '',
            status: t.isActive !== false ? 'Aktif' : 'Nonaktif'
          });
        });
      } else {
        sheet.addRow({
          name: 'Contoh: Budi Santoso',
          email: 'budi@sekolah.sch.id',
          nip: '198001012010011001',
          status: 'Aktif'
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, selected.length > 0 ? 'Export_Data_Guru.xlsx' : 'Template_Data_Guru.xlsx');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file Excel: ' + err.message);
    }
  }

  async function handleImport() {
    if (!importFile) return alert('Silakan pilih file Excel (.xlsx)');
    
    setImporting(true);
    try {
      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const sheet = workbook.getWorksheet(1);
      if (!sheet) throw new Error('Format file tidak valid, worksheet tidak ditemukan.');

      const newTeachers = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const name = row.getCell(1).text?.trim();
        if (!name || name.startsWith('Contoh:')) return;

        newTeachers.push({
          name: name,
          email: row.getCell(2).text?.trim() || '',
          nip: row.getCell(3).text?.trim() || '',
          subjectIds: importSubjectId ? [importSubjectId] : [],
          isActive: row.getCell(4).text?.trim().toLowerCase() !== 'nonaktif'
        });
      });

      if (newTeachers.length === 0) {
        alert('Tidak ada data guru yang valid untuk diimpor.');
        setImporting(false);
        return;
      }

      await Promise.all(newTeachers.map(t => addTeacher(t)));
      
      alert(`Berhasil mengimpor ${newTeachers.length} data guru.`);
      setShowImportModal(false);
      setImportFile(null);
      setImportSubjectId('');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor data: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  const filtered = teachers.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.nip?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = !filterSubject || (t.subjectIds || []).includes(filterSubject);
    return matchSearch && matchSubject;
  });

  const colors = ['bg-primary-container text-on-primary-container', 'bg-secondary-container text-on-secondary-container', 'bg-tertiary-container text-on-tertiary-container'];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-md">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface mb-xs">Manajemen Guru</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Kelola staf pengajar, lihat jadwal, dan pantau status.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-lg font-label-sm text-label-sm text-on-primary hover:bg-surface-tint shadow-sm transition-colors ambient-shadow">
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Guru
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-surface rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center mb-md border border-surface-variant ambient-shadow">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md text-body-md"
            placeholder="Cari berdasarkan nama atau NIP..."
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="w-full appearance-none bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md cursor-pointer"
            >
              <option value="">Semua Mapel</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-lg">arrow_drop_down</span>
          </div>
          <div className="flex items-center gap-2 border-l border-surface-variant pl-4">
            <span className="font-body-md text-body-md text-on-surface-variant mr-2 hidden lg:block">Aksi Masal:</span>
            <button onClick={() => setShowImportModal(true)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center" title="Impor Data Guru">
              <span className="material-symbols-outlined">upload</span>
            </button>
            <button onClick={handleDownloadTemplate} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center" title={selected.length > 0 ? "Export Guru Terpilih" : "Download Template Excel"}>
              <span className="material-symbols-outlined">download</span>
            </button>
            <button onClick={handleBulkDelete} disabled={selected.length === 0} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors disabled:opacity-30" title="Hapus Terpilih">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface rounded-xl border border-surface-variant overflow-hidden ambient-shadow">
        {loading ? <TableSkeleton rows={5} cols={5} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-surface-variant">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer" type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold">Info Guru</th>
                  <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold">Email</th>
                  <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold">Mata Pelajaran</th>
                  <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold">Status</th>
                  <th className="py-3 px-6 font-label-sm text-label-sm text-on-surface-variant font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant font-body-md">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-outline">person_off</span>
                    {search ? 'Tidak ada guru yang cocok dengan pencarian.' : 'Belum ada data guru. Klik "Tambah Guru" untuk memulai.'}
                  </td></tr>
                )}
                {filtered.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="py-4 px-4 text-center">
                      <input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer" type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${colors[idx % 3]} flex items-center justify-center font-bold text-lg shadow-sm`}>
                          {getInitials(t.name)}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-semibold text-on-surface">{t.name}</p>
                          <p className="font-caption text-caption text-outline">{t.nip || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-body-md text-body-md text-on-surface-variant">{t.email || '-'}</td>
                    <td className="py-4 px-6 font-body-md text-body-md text-on-surface-variant">
                      {(t.subjectIds || []).map(id => getSubjectName(id)).join(', ') || '-'}
                    </td>
                    <td className="py-4 px-6">
                      {t.isActive !== false ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container mr-2"></span>Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm border border-surface-variant">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right relative">
                      <button onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)} className="text-outline hover:text-primary transition-colors p-1">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      {menuOpen === t.id && (
                        <div className="absolute right-6 top-full mt-1 bg-surface-container-lowest rounded-lg shadow-lg border border-surface-variant py-1 z-50 w-36 animate-in fade-in zoom-in-95 duration-150">
                          <button onClick={() => openEdit(t)} className="w-full px-4 py-2 text-left font-body-md text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">edit</span>Edit
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="w-full px-4 py-2 text-left font-body-md text-sm text-error hover:bg-error-container/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">delete</span>Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-surface-variant p-4 flex items-center justify-between bg-surface">
          <p className="font-caption text-caption text-outline">Menampilkan {filtered.length} dari {teachers.length} guru</p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Guru' : 'Tambah Guru Baru'} icon="person_add">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Nama Lengkap *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="Masukkan nama lengkap" />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Email</label>
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="email@sekolah.sch.id" />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">NIP</label>
            <input value={form.nip} onChange={e => setForm({...form, nip: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="Nomor Induk Pegawai" />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-2">Mata Pelajaran yang Diampu</label>
            <div className="bg-surface border border-outline-variant rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
              {subjects.length === 0 ? (
                <p className="text-caption text-outline text-center py-2">Belum ada mata pelajaran</p>
              ) : (
                subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-surface-container-lowest px-2 rounded transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={(form.subjectIds || []).includes(s.id)}
                      onChange={() => {
                        const current = form.subjectIds || [];
                        setForm({
                          ...form,
                          subjectIds: current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id]
                        });
                      }}
                    />
                    <span className="font-body-md text-sm text-on-surface">{s.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Status</label>
            <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm({...form, isActive: e.target.value === 'true'})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md cursor-pointer">
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {editId ? 'Simpan Perubahan' : 'Tambah Guru'}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportFile(null); setImportSubjectId(''); }} title="Impor Data Masal" icon="upload_file">
        <div className="p-6 space-y-4">
          <div className="bg-primary-container/20 p-4 rounded-lg flex items-start gap-3 border border-primary/20">
            <span className="material-symbols-outlined text-primary mt-0.5">info</span>
            <div className="text-body-md font-body-md text-on-surface-variant">
              Pastikan Anda sudah mengunduh <strong className="text-primary font-medium">Template Excel</strong> (melalui tombol Download) dan mengisinya dengan benar sebelum melakukan impor.
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Pilih Mata Pelajaran Default (Opsional)</label>
            <select value={importSubjectId} onChange={e => setImportSubjectId(e.target.value)} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md cursor-pointer">
              <option value="">-- Kosongkan --</option>
              {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <p className="text-caption font-caption text-outline mt-1">Guru yang diimpor akan otomatis ditambahkan ke mata pelajaran ini.</p>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Pilih File Excel (.xlsx) *</label>
            <input type="file" accept=".xlsx" onChange={e => setImportFile(e.target.files[0])} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20 cursor-pointer" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportSubjectId(''); }} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleImport} disabled={importing || !importFile} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {importing && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Impor Guru
          </button>
        </div>
      </Modal>
    </div>
  );
}
