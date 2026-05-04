import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getNotifications, getAllAttendances, getJournals } from '../services/firestoreService';
import { StatCardSkeleton } from '../components/LoadingSkeleton';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [timeRange, setTimeRange] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, n, a, j] = await Promise.all([getDashboardStats(), getNotifications(5), getAllAttendances(), getJournals()]);
      setStats(s);
      setNotifications(n);
      setAttendances(a);
      setJournals(j);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }
  const dateList = Array.from({length: timeRange}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - ((timeRange - 1) - i));
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60000));
    return localDate.toISOString().split('T')[0];
  });

  const normalizeDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d.split('T')[0];
    if (typeof d.toDate === 'function') {
      const dateObj = d.toDate();
      return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return null;
  };

  const chartData = dateList.map(date => {
    let studentHadir = 0;
    let teacherHadir = 0;

    teacherHadir = journals.filter(j => normalizeDate(j.date) === date).length;

    attendances.forEach(att => {
      if (normalizeDate(att.date) === date) {
        if (att.records && Array.isArray(att.records)) {
          studentHadir += att.records.filter(r => r.status?.toLowerCase() === 'hadir').length;
        } else if (att.status?.toLowerCase() === 'hadir') {
          studentHadir += 1;
        }
      }
    });

    return { date, studentHadir, teacherHadir };
  });

  const maxCount = Math.max(...chartData.map(d => Math.max(d.studentHadir, d.teacherHadir)), 5);

  const activityIcons = {
    guru: { icon: 'person_add', bg: 'bg-primary/10', color: 'text-primary' },
    siswa: { icon: 'group_add', bg: 'bg-tertiary/10', color: 'text-tertiary' },
    jadwal: { icon: 'edit_calendar', bg: 'bg-secondary-container/30', color: 'text-on-secondary-container' },
    peringatan: { icon: 'warning', bg: 'bg-error/10', color: 'text-error' },
    gaji: { icon: 'check_circle', bg: 'bg-tertiary/10', color: 'text-tertiary' },
    default: { icon: 'notifications', bg: 'bg-primary/10', color: 'text-primary' },
  };

  function getIcon(type) {
    return activityIcons[type] || activityIcons.default;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const now = Date.now();
    const time = ts.toMillis ? ts.toMillis() : ts;
    const diff = Math.floor((now - time) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-lg flex items-end justify-between">
        <div>
          <h1 className="font-h2 text-h2 text-on-surface mb-xs">Selamat datang kembali, Admin</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Berikut adalah ringkasan terbaru dari institusi Anda.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-primary hover:bg-primary/90 text-on-primary font-label-sm text-label-sm px-md py-sm rounded-lg flex items-center gap-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Data Baru
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-surface-container-lowest rounded-lg shadow-lg border border-surface-variant py-1 z-50 w-48 animate-in fade-in zoom-in-95 duration-150">
              <button onClick={() => { navigate('/guru'); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary">person_add</span>
                Tambah Guru
              </button>
              <button onClick={() => { navigate('/siswa'); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-tertiary">group_add</span>
                Tambah Siswa
              </button>
              <button onClick={() => { navigate('/kelas'); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-secondary">meeting_room</span>
                Tambah Kelas
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
          {/* Card 1: Students */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant/20 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-lg relative z-10">
              <div className="w-12 h-12 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined icon-fill">group</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Total Siswa</p>
              <h3 className="font-h1 text-h1 text-on-surface">{stats?.totalStudents?.toLocaleString('id-ID') || 0}</h3>
            </div>
          </div>

          {/* Card 2: Teachers */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant/20 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/20 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-lg relative z-10">
              <div className="w-12 h-12 rounded-lg bg-secondary-container/30 flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined icon-fill">badge</span>
              </div>
              <span className="bg-surface-container text-on-surface-variant font-label-sm text-xs px-2 py-1 rounded-full flex items-center gap-1">
                Aktif
              </span>
            </div>
            <div className="relative z-10">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Total Guru</p>
              <h3 className="font-h1 text-h1 text-on-surface">{stats?.totalTeachers || 0}</h3>
            </div>
          </div>

          {/* Card 3: Classes */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant/20 relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary-container/20 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-lg relative z-10">
              <div className="w-12 h-12 rounded-lg bg-tertiary-container/30 flex items-center justify-center text-on-tertiary-container">
                <span className="material-symbols-outlined icon-fill">door_front</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Total Kelas</p>
              <h3 className="font-h1 text-h1 text-on-surface">{stats?.totalClasses || 0}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Activity Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-lg gap-4">
            <div>
              <h3 className="font-h3 text-h3 text-on-surface">Tren Kehadiran</h3>
              <p className="font-caption text-caption text-on-surface-variant mt-1">Grafik kehadiran siswa (Hadir) dan guru (Jurnal).</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setTimeRange(7)} 
                className={`px-3 py-1.5 rounded-lg text-label-sm font-label-sm transition-colors ${timeRange === 7 ? 'bg-primary text-on-primary shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface'}`}
              >
                7 Hari
              </button>
              <button 
                onClick={() => setTimeRange(30)} 
                className={`px-3 py-1.5 rounded-lg text-label-sm font-label-sm transition-colors ${timeRange === 30 ? 'bg-primary text-on-primary shadow-sm' : 'border border-outline-variant text-on-surface-variant hover:bg-surface'}`}
              >
                30 Hari
              </button>
            </div>
          </div>
          
          {/* Simulated Chart Area */}
          <div className="flex-1 flex items-end gap-sm h-64 mt-auto border-b border-surface-variant pb-2 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-caption font-caption text-outline-variant pb-2">
              <span>{maxCount}</span>
              <span>{Math.round(maxCount * 0.75)}</span>
              <span>{Math.round(maxCount * 0.5)}</span>
              <span>{Math.round(maxCount * 0.25)}</span>
              <span>0</span>
            </div>
            
            {/* Grid lines */}
            <div className="absolute left-8 right-0 top-0 h-full flex flex-col justify-between z-0 pointer-events-none">
              <div className="w-full h-px bg-surface-variant"></div>
              <div className="w-full h-px bg-surface-variant"></div>
              <div className="w-full h-px bg-surface-variant"></div>
              <div className="w-full h-px bg-surface-variant"></div>
              <div className="w-full h-px bg-surface-variant"></div>
            </div>

            {/* Bars */}
            <div className="flex-1 flex items-end justify-between pl-8 z-10 w-full">
              {chartData.map((d, i) => {
                const sHeight = (d.studentHadir / maxCount) * 100;
                const tHeight = (d.teacherHadir / maxCount) * 100;
                const showLabel = timeRange <= 7 || (i % Math.ceil(timeRange / 5) === 0) || i === timeRange - 1;
                
                return (
                  <div key={i} className={`flex flex-col items-center group relative ${timeRange > 14 ? 'gap-0.5' : 'gap-1'}`} style={{ width: `${100/timeRange}%` }}>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-surface-container-highest text-on-surface font-label-sm text-xs px-3 py-2 rounded shadow-md transition-opacity pointer-events-none z-20 w-max text-center">
                      <p className="font-bold mb-1">{d.date.substring(5, 10).replace('-', '/')}</p>
                      <p className="flex items-center gap-2 justify-between">
                        <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                        Siswa: {d.studentHadir}
                      </p>
                      <p className="flex items-center gap-2 justify-between">
                        <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
                        Guru: {d.teacherHadir}
                      </p>
                    </div>

                    <div className="flex w-full justify-center items-end h-48 px-0.5 gap-0.5">
                      <div 
                        className="w-1/2 max-w-[20px] bg-primary-container rounded-t-sm transition-all group-hover:opacity-80"
                        style={{ height: `${sHeight}%`, minHeight: '2px' }}
                      ></div>
                      <div 
                        className="w-1/2 max-w-[20px] bg-secondary-container rounded-t-sm transition-all group-hover:opacity-80"
                        style={{ height: `${tHeight}%`, minHeight: '2px' }}
                      ></div>
                    </div>
                    <div className="h-4 flex items-center justify-center w-full mt-2">
                      <span className="text-[10px] text-outline whitespace-nowrap">
                        {showLabel ? d.date.substring(5, 10).replace('-', '/') : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-md mt-sm pt-sm">
            <div className="flex items-center gap-xs">
              <div className="w-3 h-3 rounded-full bg-primary-container"></div>
              <span className="font-caption text-caption text-on-surface-variant">Siswa (Hadir)</span>
            </div>
            <div className="flex items-center gap-xs">
              <div className="w-3 h-3 rounded-full bg-secondary-container"></div>
              <span className="font-caption text-caption text-on-surface-variant">Guru (Jurnal)</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-md flex flex-col">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-h3 text-h3 text-on-surface">Aktivitas Terbaru</h3>
          </div>
          
          <div className="flex-1 flex flex-col gap-sm overflow-hidden">
            {notifications.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline">notifications_off</span>
                <p className="font-body-md text-body-md">Belum ada aktivitas</p>
              </div>
            )}
            {notifications.map(notif => {
              const ic = getIcon(notif.type);
              return (
                <div key={notif.id} className="flex gap-sm p-sm rounded-lg hover:bg-surface transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-full ${ic.bg} flex items-center justify-center ${ic.color} flex-shrink-0`}>
                    <span className="material-symbols-outlined text-sm">{ic.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-on-surface">{notif.title || 'Notifikasi'}</p>
                    <p className="font-caption text-caption text-on-surface-variant line-clamp-1">{notif.message || ''}</p>
                    <p className="font-caption text-caption text-outline mt-xs">{timeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
