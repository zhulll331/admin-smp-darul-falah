import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Gagal masuk. Periksa kembali email dan password Anda.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 antialiased animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg border border-surface-variant overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center bg-primary-container/10 border-b border-surface-variant flex flex-col items-center">
          <img src="/logo.png" alt="Logo SMP Plus Darul Falah" className="w-20 h-20 object-contain mb-4" />
          <h1 className="font-h3 text-h3 text-on-surface font-bold">EduManage Admin</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">SMP Plus Darul Falah</p>
        </div>
        
        {/* Form */}
        <div className="p-8">
          <h2 className="font-h3 text-xl text-on-surface font-semibold mb-6">Masuk ke Akun Anda</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg font-label-sm text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">error</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2" htmlFor="email">
                Alamat Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">mail</span>
                <input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  placeholder="admin@smpplus.edu"
                  required
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <a href="#" className="font-label-sm text-sm text-primary hover:text-primary-container transition-colors">Lupa password?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input 
                  id="password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm shadow-sm hover:shadow-md hover:bg-surface-tint transition-all disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>Masuk <span className="material-symbols-outlined text-sm">arrow_forward</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
