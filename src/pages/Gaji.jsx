import React, { useState, useEffect } from 'react';
import { getTeachers, getJournals, getSalaryConfig, saveSalaryConfig, formatRupiah, getInitials } from '../services/firestoreService';
import Modal from '../components/Modal';
import { TableSkeleton, StatCardSkeleton } from '../components/LoadingSkeleton';

export default function Gaji() {
  const [teachers, setTeachers] = useState([]);
  const [journals, setJournals] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState({ rateMapel: 50000, rateEkstra: 75000, ratePramuka: 100000, ratePiket: 40000 });
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, j, config] = await Promise.all([getTeachers(), getJournals(), getSalaryConfig()]);
      setTeachers(t);
      setJournals(j);
      setSalaryConfig(config);
      setConfigForm(config);
      calculateSalaries(t, j, config);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function calculateSalaries(teacherList, journalList, config) {
    const monthJournals = journalList.filter(j => {
      let d = j.date;
      if (d && typeof d.toDate === 'function') {
        // Convert local time to string safely
        const dateObj = d.toDate();
        d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      }
      // Hanya hitung jurnal yang sudah diverifikasi admin
      return typeof d === 'string' && d.startsWith(selectedMonth) && j.verified === true;
    });
    
    const data = teacherList.map(t => {
      const teacherJournals = monthJournals.filter(j => j.teacherId === t.id);
      
      let jpMapel = 0;
      let jpPiket = 0;
      
      teacherJournals.forEach(j => {
        const jp = parseInt(j.jamPelajaran || j.jp) || 1;
        if (j.tipeKegiatan === 'piket') {
          jpPiket += jp;
        } else {
          jpMapel += jp;
        }
      });
      
      const totalHours = jpMapel + jpPiket; // Total JP
      const gajiPokok = (jpMapel * (config.rateMapel || 50000)) + (jpPiket * (config.ratePiket || 40000));
      const tunjangan = 0; // Can be extended
      
      return {
        id: t.id,
        name: t.name,
        nip: t.nip || '-',
        role: 'Guru Mapel',
        type: t.isActive ? 'Aktif' : 'Nonaktif',
        totalHours, // This is now Total JP
        gajiPokok,
        tunjangan,
        gajiBersih: gajiPokok + tunjangan,
        verified: verifiedIds.has(t.id)
      };
    }).filter(d => d.totalHours > 0 || verifiedIds.has(d.id));
    setSalaryData(data);
  }

  useEffect(() => {
    if (teachers.length > 0) calculateSalaries(teachers, journals, salaryConfig);
  }, [selectedMonth, verifiedIds]);

  async function handleSync() {
    setIsSyncing(true);
    try {
      const [t, j] = await Promise.all([getTeachers(), getJournals()]);
      setTeachers(t);
      setJournals(j);
      calculateSalaries(t, j, salaryConfig);
    } catch (err) { console.error(err); }
    finally { setIsSyncing(false); }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      await saveSalaryConfig(configForm);
      setSalaryConfig(configForm);
      calculateSalaries(teachers, journals, configForm);
      setShowConfigModal(false);
    } catch (err) { console.error(err); alert('Gagal menyimpan konfigurasi.'); }
    finally { setSavingConfig(false); }
  }

  function handleVerify(id) {
    setVerifiedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleDownloadPDF() { window.print(); }

  const totalPenggajian = salaryData.reduce((sum, d) => sum + d.gajiBersih, 0);
  const verified = salaryData.filter(d => d.verified).length;
  const pending = salaryData.filter(d => !d.verified).length;

  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const [year, month] = selectedMonth.split('-');
  const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-xl print:pb-0">
      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-center">Rekap Penggajian Guru — {monthLabel}</h1>
        <p className="text-center text-sm text-gray-600">SMP Plus Darul Falah</p>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-lg print:hidden">
        <div>
          <h2 className="font-h2 text-h2 text-on-background mb-1">Manajemen Gaji</h2>
          <p className="font-body-md text-body-md text-outline">Kelola dan proses honorarium bulanan untuk staf pengajar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 font-label-sm text-label-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer shadow-sm" />
          <button onClick={() => { setConfigForm(salaryConfig); setShowConfigModal(true); }} className="bg-surface-container-lowest border border-primary text-primary font-label-sm text-label-sm px-6 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Konfigurasi Nominal
          </button>
          <button onClick={handleDownloadPDF} className="bg-primary text-on-primary font-label-sm text-label-sm px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">print</span>
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-lg print:hidden">
        {loading ? <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></> : (
          <>
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/10 rounded-full"></div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-label-sm text-label-sm text-outline">Total Penggajian</h3>
                <span className="material-symbols-outlined text-primary-container bg-primary-container/10 p-1.5 rounded-md">account_balance</span>
              </div>
              <div className="font-h2 text-h2 text-on-surface">{formatRupiah(totalPenggajian)}</div>
              <div className="mt-2 text-caption text-outline">{monthLabel}</div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-label-sm text-label-sm text-outline">Sudah Diverifikasi</h3>
                <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-1.5 rounded-md">task_alt</span>
              </div>
              <div className="font-h2 text-h2 text-on-surface">{verified}<span className="text-h3 text-outline">/{salaryData.length}</span></div>
              <div className="mt-2 font-caption text-caption text-outline">Guru Sudah Gajian</div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-label-sm text-label-sm text-outline">Belum Diverifikasi</h3>
                <span className="material-symbols-outlined text-error bg-error-container p-1.5 rounded-md">pending_actions</span>
              </div>
              <div className="font-h2 text-h2 text-on-surface">{pending}</div>
              {pending > 0 && (
                <div className="mt-2 font-caption text-caption text-error flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[14px]">warning</span>Perlu perhatian
                </div>
              )}
            </div>
            <button onClick={handleSync} disabled={isSyncing} className="bg-primary text-on-primary rounded-xl p-6 border border-primary shadow-sm relative overflow-hidden group text-left transition-all hover:opacity-90 active:scale-95 disabled:opacity-75 disabled:cursor-wait">
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 transition-transform duration-500 group-hover:rotate-180">
                <span className={`material-symbols-outlined text-[120px] text-white/10 ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
              </div>
              <h3 className="font-label-sm text-label-sm text-primary-fixed mb-4">Sinkronkan dari Jurnal</h3>
              <div className="font-h2 text-h2 mb-1">
                {isSyncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}
              </div>
              <div className="font-caption text-caption text-primary-fixed">Hitung gaji dari data jurnal</div>
            </button>
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface print:hidden">
          <h3 className="font-h3 text-[18px] text-on-surface">Daftar Penggajian Guru — {monthLabel}</h3>
        </div>

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant font-label-sm text-label-sm text-outline uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Guru</th>
                  <th className="px-6 py-4 font-semibold">Jam Mengajar</th>
                  <th className="px-6 py-4 font-semibold text-right">Gaji Pokok</th>
                  <th className="px-6 py-4 font-semibold text-right">Tunjangan</th>
                  <th className="px-6 py-4 font-semibold text-right">Gaji Bersih</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md divide-y divide-surface-variant">
                {salaryData.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-outline">payments</span>
                    <p>Belum ada data gaji. Klik "Sinkronkan dari Jurnal" untuk menghitung.</p>
                  </td></tr>
                )}
                {salaryData.map(d => (
                  <tr key={d.id} className={`hover:bg-surface transition-colors group ${!d.verified ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-sm">{getInitials(d.name)}</div>
                        <div>
                          <div className="font-semibold text-on-surface">{d.name}</div>
                          <div className="text-caption text-outline">{d.nip}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface">{d.totalHours} jam</td>
                    <td className="px-6 py-4 text-right tabular-nums text-on-surface">{formatRupiah(d.gajiPokok)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-on-surface">{formatRupiah(d.tunjangan)}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold text-primary">{formatRupiah(d.gajiBersih)}</td>
                    <td className="px-6 py-4 text-center">
                      {d.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-primary border border-primary-container/30 font-label-sm text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>Dibayar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-secondary-fixed-dim border border-secondary-container font-label-sm text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim"></span>Tertunda
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right print:hidden">
                      {d.verified ? (
                        <button onClick={handleDownloadPDF} className="text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                          <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>
                      ) : (
                        <button onClick={() => handleVerify(d.id)} className="bg-primary text-on-primary hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-lg font-label-sm text-[12px] font-semibold flex items-center justify-end gap-1 ml-auto">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Verifikasi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-surface-variant flex items-center justify-between text-caption text-outline bg-surface print:hidden">
          <div>Menampilkan {salaryData.length} guru</div>
        </div>
      </div>

      {/* Config Modal */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Konfigurasi Nominal Gaji" icon="payments">
        <div className="p-6 space-y-4">
          <p className="text-caption font-caption text-on-surface-variant mb-4">
            Atur nominal honorarium yang akan dikalikan dengan data kehadiran/jurnal guru.
          </p>
          {[
            { key: 'rateMapel', label: 'Guru Mapel (Per Jam/Pertemuan)' },
            { key: 'rateEkstra', label: 'Ekstrakurikuler (Per Pertemuan)' },
            { key: 'ratePramuka', label: 'Pembina Pramuka (Per Pertemuan)' },
            { key: 'ratePiket', label: 'Guru Piket (Per Hari)' },
          ].map(item => (
            <div key={item.key}>
              <label className="block font-label-sm text-label-sm text-on-surface mb-1">{item.label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md">Rp</span>
                <input type="number" value={configForm[item.key] || 0} onChange={e => setConfigForm({...configForm, [item.key]: Number(e.target.value)})} className="w-full bg-surface border border-outline-variant rounded-lg py-2 pl-10 pr-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow text-body-md font-body-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-surface-variant flex justify-end gap-2 bg-surface">
          <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 rounded-lg font-label-sm text-label-sm text-on-surface border border-outline hover:bg-surface-variant transition-colors">Batal</button>
          <button onClick={handleSaveConfig} disabled={savingConfig} className="px-4 py-2 rounded-lg font-label-sm text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {savingConfig && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Simpan Konfigurasi
          </button>
        </div>
      </Modal>
    </div>
  );
}
