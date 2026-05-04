import React, { useState, useEffect } from 'react';
import { getSchoolConfig, saveSchoolConfig, getAcademicYears } from '../services/firestoreService';

export default function Pengaturan() {
  const [config, setConfig] = useState({ name: '', npsn: '', address: '', email: '', phone: '', activeAcademicYear: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [c, ay] = await Promise.all([getSchoolConfig(), getAcademicYears()]);
      setConfig(c);
      setAcademicYears(ay);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveSchoolConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); alert('Gagal menyimpan.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto w-full pb-lg">
      <div className="mb-lg">
        <h1 className="text-h2 font-h2 text-on-surface mb-xs">Pengaturan Sistem</h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant">Kelola konfigurasi aplikasi dan preferensi akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {/* Profile Card */}
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant">
          <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <h2 className="text-h3 font-h3 text-on-surface">Profil Instansi</h2>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-surface-container-high rounded w-full" />
              <div className="h-10 bg-surface-container-high rounded w-full" />
              <div className="h-10 bg-surface-container-high rounded w-2/3" />
            </div>
          ) : (
            <div className="space-y-md">
              <div className="flex-1 space-y-sm w-full">
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface mb-xs">Nama Sekolah</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow" type="text" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} placeholder="SMP Plus Darul Falah" />
                </div>
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface mb-xs">NPSN</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow" type="text" value={config.npsn} onChange={e => setConfig({...config, npsn: e.target.value})} placeholder="20212345" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface mb-xs">Email Kontak</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow" type="email" value={config.email} onChange={e => setConfig({...config, email: e.target.value})} placeholder="admin@sekolah.sch.id" />
                </div>
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface mb-xs">Nomor Telepon</label>
                  <input className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow" type="tel" value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} placeholder="(021) 555-0123" />
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-label-sm text-on-surface mb-xs">Alamat Lengkap</label>
                <textarea className="w-full bg-surface border border-outline-variant rounded-lg py-2 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow" rows={3} value={config.address} onChange={e => setConfig({...config, address: e.target.value})} placeholder="Jl. Pendidikan No. 123..." />
              </div>

              <div className="flex justify-end pt-sm border-t border-surface-variant items-center gap-3">
                {saved && (
                  <span className="text-primary font-label-sm text-label-sm flex items-center gap-1 animate-in fade-in duration-200">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Tersimpan!
                  </span>
                )}
                <button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary px-lg py-2 rounded-lg text-label-sm font-label-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50" type="button">
                  {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Config Card */}
        <div className="col-span-1 bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant flex flex-col">
          <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
            <h2 className="text-h3 font-h3 text-on-surface">Konfigurasi Sistem</h2>
          </div>

          <div className="space-y-md flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-md font-body-md text-on-surface font-medium">Tahun Ajaran Aktif</p>
                <p className="text-caption font-caption text-on-surface-variant">Set default untuk semua modul</p>
              </div>
              <select value={config.activeAcademicYear} onChange={e => { setConfig({...config, activeAcademicYear: e.target.value}); setSaved(false); }} className="bg-surface border border-outline-variant rounded-lg py-1 px-3 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="">Pilih...</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>{ay.name || ay.id}</option>
                ))}
                {academicYears.length === 0 && (
                  <>
                    <option value="2024/2025-genap">2024/2025 Genap</option>
                    <option value="2024/2025-ganjil">2024/2025 Ganjil</option>
                    <option value="2025/2026-ganjil">2025/2026 Ganjil</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-md font-body-md text-on-surface font-medium">Mode Maintenance</p>
                <p className="text-caption font-caption text-on-surface-variant">Nonaktifkan akses user</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-md font-body-md text-on-surface font-medium">Auto-Backup</p>
                <p className="text-caption font-caption text-on-surface-variant">Cadangkan data harian</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="col-span-1 md:col-span-3 bg-surface-container-lowest rounded-xl p-md shadow-sm border border-surface-variant">
          <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
            <h2 className="text-h3 font-h3 text-on-surface">Preferensi Notifikasi</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
            {[
              { label: 'Laporan Absensi', desc: 'Kirim rekap absensi harian via Email.' },
              { label: 'Peringatan Kehadiran', desc: 'Notifikasi siswa dengan alfa > 3 kali.' },
              { label: 'Jadwal Pengganti', desc: 'Pemberitahuan perubahan jadwal guru.' },
              { label: 'Pembayaran SPP', desc: 'Alert tunggakan pembayaran siswa.' },
            ].map((n, i) => (
              <div key={i} className="p-sm rounded-lg bg-surface flex items-start gap-sm border border-surface-variant hover:border-primary/30 transition-colors">
                <div className="mt-1">
                  <input type="checkbox" defaultChecked={i < 2 || i === 3} className="w-4 h-4 text-primary bg-surface-container-highest border-outline-variant rounded focus:ring-primary focus:ring-2 cursor-pointer" />
                </div>
                <div>
                  <p className="text-body-md font-body-md text-on-surface font-medium">{n.label}</p>
                  <p className="text-caption font-caption text-on-surface-variant">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
