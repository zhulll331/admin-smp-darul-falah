import React, { useState, useEffect } from 'react';
import { getStudents, addStudent, updateStudent, deleteStudent, getClasses, getInitials } from '../services/firestoreService';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const emptyForm = { name: '', nis: '', classId: '', gender: 'Laki-laki', guardianContact: '', guardianEmail: '', isActive: true };

export default function Siswa() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importClassId, setImportClassId] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getStudents(), getClasses()]);
      setStudents(s);
      setClasses(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getClassName(classId) {
    const c = classes.find(x => x.id === classId);
    return c?.name || classId || '-';
  }

  function openAdd() { setEditId(null); setForm(emptyForm); setShowModal(true); }

  function openEdit(s) {
    setEditId(s.id);
    setForm({ name: s.name||'', nis: s.nis||'', classId: s.classId||'', gender: s.gender||'Laki-laki', guardianContact: s.guardianContact||'', guardianEmail: s.guardianEmail||'', isActive: s.isActive !== false });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Nama siswa wajib diisi');
    setSaving(true);
    try {
      if (editId) { await updateStudent(editId, form); }
      else { await addStudent(form); }
      setShowModal(false);
      await loadData();
    } catch (err) { console.error(err); alert('Gagal menyimpan.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;
    try { await deleteStudent(id); await loadData(); }
    catch (err) { console.error(err); }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Hapus ${selected.length} siswa terpilih?`)) return;
    try {
      await Promise.all(selected.map(id => deleteStudent(id)));
      setSelected([]);
      await loadData();
    } catch (err) { console.error(err); }
  }

  async function handleImport() {
    if (!importFile) return alert('Silakan pilih file Excel (.xlsx)');
    if (!importClassId) return alert('Silakan pilih kelas tujuan untuk data yang diimpor');
    
    setImporting(true);
    try {
      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const sheet = workbook.getWorksheet(1);
      if (!sheet) throw new Error('Format file tidak valid, worksheet tidak ditemukan.');

      const newStudents = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const name = row.getCell(1).text?.trim();
        if (!name || name.startsWith('Contoh:')) return;

        newStudents.push({
          name: name,
          nis: row.getCell(2).text?.trim() || '',
          gender: row.getCell(3).text?.trim() || 'Laki-laki',
          classId: importClassId,
          guardianContact: row.getCell(5).text?.trim() || '',
          guardianEmail: row.getCell(6).text?.trim() || '',
          isActive: row.getCell(7).text?.trim().toLowerCase() !== 'nonaktif'
        });
      });

      if (newStudents.length === 0) {
        alert('Tidak ada data siswa yang valid untuk diimpor.');
        setImporting(false);
        return;
      }

      await Promise.all(newStudents.map(s => addStudent(s)));
      
      alert(`Berhasil mengimpor ${newStudents.length} data siswa.`);
      setShowImportModal(false);
      setImportFile(null);
      setImportClassId('');
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Gagal mengimpor data: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Data Siswa');
      
      sheet.columns = [
        { header: 'Nama Siswa', key: 'name', width: 30 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'Jenis Kelamin', key: 'gender', width: 15 },
        { header: 'ID Kelas', key: 'classId', width: 25 },
        { header: 'Kontak Wali', key: 'guardianContact', width: 20 },
        { header: 'Email Wali', key: 'guardianEmail', width: 25 },
        { header: 'Status', key: 'status', width: 20 },
      ];

      sheet.getRow(1).font = { bold: true };

      if (selected.length > 0) {
        const selectedStudents = students.filter(s => selected.includes(s.id));
        selectedStudents.forEach(s => {
          sheet.addRow({
            name: s.name || '',
            nis: s.nis || '',
            gender: s.gender || '',
            classId: s.classId || '',
            guardianContact: s.guardianContact || '',
            guardianEmail: s.guardianEmail || '',
            status: s.isActive !== false ? 'Aktif' : 'Nonaktif'
          });
        });
      } else {
        sheet.addRow({
          name: 'Contoh: Ahmad',
          nis: '12345',
          gender: 'Laki-laki',
          classId: classes[0]?.id || 'ID_KELAS_DISINI',
          guardianContact: '08123456789',
          guardianEmail: 'wali@email.com',
          status: 'Aktif'
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, selected.length > 0 ? 'Export_Data_Siswa.xlsx' : 'Template_Data_Siswa.xlsx');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file Excel: ' + err.message);
    }
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(s => s.id));
  }

  const filtered = students.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.nis?.toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || s.classId === filterClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-md">
        <div>
          <h2 className="font-h2 text-h2 text-on-surface mb-xs">Manajemen Siswa</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Lihat, kelola, dan perbarui data siswa di semua kelas.</p>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-primary rounded-lg font-label-sm text-label-sm text-on-primary hover:bg-surface-tint shadow-sm transition-colors ambient-shadow">
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center mb-md border border-surface-variant ambient-shadow">
        <div className="flex items-center gap-sm w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input className="w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="Cari berdasarkan nama atau NIS..." type="text" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer">
              <option value="">Semua Kelas</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-lg">arrow_drop_down</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-body-md text-body-md text-on-surface-variant mr-2">Aksi Masal:</span>
          <button onClick={() => setShowImportModal(true)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center" title="Impor Data Siswa">
            <span className="material-symbols-outlined">upload</span>
          </button>
          <button onClick={handleDownloadTemplate} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center" title={selected.length > 0 ? "Export Siswa Terpilih" : "Download Template Excel"}>
            <span className="material-symbols-outlined">download</span>
          </button>
          <button onClick={handleBulkDelete} disabled={selected.length === 0} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors disabled:opacity-30" title="Hapus Terpilih">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-surface rounded-xl border border-surface-variant overflow-hidden ambient-shadow">
        {loading ? <TableSkeleton rows={5} cols={6} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-surface-variant">
                <tr>
                  <th className="py-3 px-4 w-12">
                    <input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer" type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Nama Siswa</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">NIS</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Kelas</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Kontak Wali</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold">Status</th>
                  <th className="py-3 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant font-body-md">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-outline">school</span>
                    {search ? 'Tidak ditemukan.' : 'Belum ada data siswa.'}
                  </td></tr>
                )}
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-surface-container-lowest transition-colors group">
                    <td className="py-3 px-4">
                      <input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer" type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${s.isActive !== false ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-variant text-on-surface-variant'} flex items-center justify-center font-bold text-sm`}>
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <p className="font-label-sm text-label-sm text-on-surface font-semibold">{s.name}</p>
                          <p className="font-caption text-caption text-on-surface-variant">{s.gender || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface">{s.nis || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-surface-container-highest text-on-surface font-caption text-caption font-medium border border-outline-variant/30">
                        {getClassName(s.classId)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">{s.guardianContact ? 'call' : 'mail'}</span>
                        <span className="font-body-md text-body-md">{s.guardianContact || s.guardianEmail || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-caption text-caption font-medium ${s.isActive !== false ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isActive !== false ? 'bg-primary' : 'bg-error'}`}></span>
                        {s.isActive !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-outline hover:text-primary transition-colors rounded-md hover:bg-surface-container-low" title="Edit">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/20" title="Hapus">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-surface-variant bg-surface flex items-center justify-between">
          <span className="font-caption text-caption text-on-surface-variant">Menampilkan {filtered.length} dari {students.length} data</span>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Siswa' : 'Tambah Siswa Baru'} icon="group_add">
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Nama Lengkap *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="Masukkan nama siswa" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">NIS</label>
              <input value={form.nis} onChange={e => setForm({...form, nis: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="Nomor Induk Siswa" />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">Jenis Kelamin</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md cursor-pointer">
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Kelas</label>
            <select value={form.classId} onChange={e => setForm({...form, classId: e.target.value})} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md cursor-pointer">
              <option value="">Pilih Kelas...</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Kontak Wali (HP)</label>
            <input value={form.guardianContact} onChange={e => setForm({...form, guardianContact: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" placeholder="08xx-xxxx-xxxx" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {editId ? 'Simpan' : 'Tambah Siswa'}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportFile(null); setImportClassId(''); }} title="Impor Data Masal" icon="upload_file">
        <div className="p-6 space-y-4">
          <div className="bg-primary-container/20 p-4 rounded-lg flex items-start gap-3 border border-primary/20">
            <span className="material-symbols-outlined text-primary mt-0.5">info</span>
            <div className="text-body-md font-body-md text-on-surface-variant">
              Pastikan Anda sudah mengunduh <strong className="text-primary font-medium">Template Excel</strong> (melalui tombol Download) dan mengisinya dengan benar sebelum melakukan impor.
            </div>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Pilih Kelas Tujuan *</label>
            <select value={importClassId} onChange={e => setImportClassId(e.target.value)} className="w-full appearance-none bg-surface border border-outline-variant rounded-lg py-2 px-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md cursor-pointer">
              <option value="">Pilih Kelas...</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <p className="text-caption font-caption text-outline mt-1">Semua siswa dalam file Excel akan dimasukkan ke kelas ini secara otomatis.</p>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-1">Pilih File Excel (.xlsx) *</label>
            <input type="file" accept=".xlsx" onChange={e => setImportFile(e.target.files[0])} className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary/20 cursor-pointer" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportClassId(''); }} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleImport} disabled={importing || !importFile || !importClassId} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {importing && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Impor Siswa
          </button>
        </div>
      </Modal>
    </div>
  );
}
