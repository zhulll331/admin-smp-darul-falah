import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopAppBar from './TopAppBar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-hidden print:overflow-visible print:bg-white print:text-black">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:translate-x-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:block print:hidden`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen print:h-auto relative lg:ml-0 print:ml-0 overflow-x-hidden w-full">
        <div className="print:hidden">
          <TopAppBar onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <div className="mt-16 print:mt-0 p-4 lg:p-gutter print:p-0 overflow-y-auto print:overflow-visible flex-1 bg-background print:bg-white">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
