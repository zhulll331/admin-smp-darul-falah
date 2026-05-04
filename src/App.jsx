import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Guru from './pages/Guru';
import Siswa from './pages/Siswa';
import Kelas from './pages/Kelas';
import Mapel from './pages/Mapel';
import Absensi from './pages/Absensi';
import Jurnal from './pages/Jurnal';
import Laporan from './pages/Laporan';
import Gaji from './pages/Gaji';
import Pengaturan from './pages/Pengaturan';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="guru" element={<Guru />} />
        <Route path="siswa" element={<Siswa />} />
        <Route path="kelas" element={<Kelas />} />
        <Route path="mapel" element={<Mapel />} />
        <Route path="absensi" element={<Absensi />} />
        <Route path="jurnal" element={<Jurnal />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="gaji" element={<Gaji />} />
        <Route path="pengaturan" element={<Pengaturan />} />
      </Route>
    </Routes>
  );
}

export default App;
