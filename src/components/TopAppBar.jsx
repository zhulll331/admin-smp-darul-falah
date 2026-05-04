import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudents, getTeachers, getClasses } from '../services/firestoreService';

export default function TopAppBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [data, setData] = useState({ students: [], teachers: [], classes: [] });
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    Promise.all([getStudents(), getTeachers(), getClasses()]).then(([s, t, c]) => {
      setData({ students: s, teachers: t, classes: c });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      const q = query.toLowerCase();
      const sMatches = data.students.filter(x => x.name?.toLowerCase().includes(q) || x.nis?.toLowerCase().includes(q)).map(x => ({ ...x, type: 'siswa', className: data.classes.find(c => c.id === x.classId)?.name }));
      const tMatches = data.teachers.filter(x => x.name?.toLowerCase().includes(q) || x.nip?.toLowerCase().includes(q)).map(x => ({ ...x, type: 'guru' }));
      
      setResults([...sMatches, ...tMatches].slice(0, 8));
    } else {
      setResults([]);
    }
  }, [query, data]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-8">
      {/* Left: Search */}
      <div className="flex-1 max-w-md relative" ref={dropdownRef}>
        <div className="relative flex items-center w-full h-10 rounded-lg bg-surface focus-within:bg-surface-container-lowest border border-transparent focus-within:border-outline-variant overflow-hidden transition-colors">
          <div className="grid place-items-center h-full w-12 text-outline">
            <span className="material-symbols-outlined text-sm">search</span>
          </div>
          <input 
            className="peer h-full w-full outline-none text-sm text-on-surface bg-transparent pr-2 font-['Plus_Jakarta_Sans']" 
            id="search" 
            placeholder="Cari siswa, guru..." 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        
        {/* Search Results Dropdown */}
        {isFocused && query.length > 1 && (
          <div className="absolute top-full mt-2 left-0 w-full bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant max-h-96 overflow-y-auto z-50 py-2 animate-in fade-in slide-in-from-top-2">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-outline text-center">Tidak ada hasil ditemukan untuk "{query}"</p>
            ) : (
              results.map(r => (
                <div key={`${r.type}-${r.id}`} onClick={() => { navigate(`/${r.type}`); setIsFocused(false); setQuery(''); }} className="px-4 py-3 hover:bg-surface-container-low cursor-pointer flex items-center gap-3 border-b border-outline-variant/30 last:border-0 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${r.type === 'siswa' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container'}`}>
                    {r.name?.substring(0,2).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{r.name}</p>
                    <p className="text-xs text-outline truncate flex items-center gap-1">
                      <span className="capitalize font-medium">{r.type}</span>
                      {r.type === 'siswa' && r.className && <>&bull; Kelas {r.className}</>}
                      {r.type === 'guru' && r.nip && <>&bull; NIP {r.nip}</>}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-md ml-auto">
        <button className="text-gray-500 dark:text-gray-400 hover:text-[#2DCE89] transition-colors p-2 rounded-full hover:bg-surface relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="text-gray-500 dark:text-gray-400 hover:text-[#2DCE89] transition-colors p-2 rounded-full hover:bg-surface">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="h-6 w-px bg-outline-variant/50 mx-xs"></div>
        <button className="text-gray-500 dark:text-gray-400 hover:text-[#2DCE89] transition-colors font-['Plus_Jakarta_Sans'] text-sm font-medium px-2">
          Bantuan
        </button>
        <button className="flex items-center gap-sm ml-sm hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold font-['Plus_Jakarta_Sans'] text-sm">
            AD
          </div>
        </button>
      </div>
    </header>
  );
}
