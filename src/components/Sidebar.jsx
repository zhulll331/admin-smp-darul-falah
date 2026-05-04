import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
  { id: 'guru', label: 'Guru', icon: 'badge', path: '/guru' },
  { id: 'siswa', label: 'Siswa', icon: 'group', path: '/siswa' },
  { id: 'kelas', label: 'Kelas', icon: 'door_front', path: '/kelas' },
  { id: 'mapel', label: 'Mapel', icon: 'auto_stories', path: '/mapel' },
  { id: 'absensi', label: 'Absensi', icon: 'calendar_today', path: '/absensi' },
  { id: 'jurnal', label: 'Jurnal', icon: 'import_contacts', path: '/jurnal' },
  { id: 'laporan', label: 'Laporan', icon: 'summarize', path: '/laporan' },
  { id: 'gaji', label: 'Gaji', icon: 'payments', path: '/gaji' }
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <nav className="h-screen w-64 fixed left-0 top-0 border-r bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm flex flex-col py-6 z-50">
      {/* Header */}
      <div className="px-gutter mb-lg flex items-center gap-sm">
        <img src="/logo.png" alt="Logo SMP Plus Darul Falah" className="w-12 h-12 object-contain" />
        <div>
          <h2 className="text-xl font-bold text-primary dark:text-primary font-['Plus_Jakarta_Sans'] leading-tight">SMP Plus<br/>Darul Falah</h2>
        </div>
      </div>
      
      {/* Navigation Links */}
      <div className="flex flex-col gap-xs px-sm flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-md px-md py-sm rounded-lg transition-colors duration-200 active:scale-95 font-['Plus_Jakarta_Sans'] text-sm font-medium ${
                isActive
                  ? 'relative bg-emerald-50 dark:bg-emerald-900/20 text-[#2DCE89] font-bold before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[#2DCE89] before:rounded-r-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#2DCE89] hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined ${isActive ? 'icon-fill' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Bottom Settings Link */}
      <div className="mt-auto px-sm pt-sm border-t border-surface-variant flex flex-col gap-1">
        <NavLink
          to="/pengaturan"
          className={({ isActive }) =>
            `flex items-center gap-md px-md py-sm rounded-lg transition-colors duration-200 active:scale-95 font-['Plus_Jakarta_Sans'] text-sm font-medium ${
              isActive
                ? 'relative bg-emerald-50 dark:bg-emerald-900/20 text-[#2DCE89] font-bold before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[#2DCE89] before:rounded-r-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-[#2DCE89] hover:bg-gray-50 dark:hover:bg-gray-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined ${isActive ? 'icon-fill' : ''}`}>
                settings
              </span>
              Pengaturan
            </>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-md px-md py-sm rounded-lg transition-colors duration-200 active:scale-95 font-['Plus_Jakarta_Sans'] text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined">logout</span>
          Keluar
        </button>
      </div>
    </nav>
  );
}
