import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopAppBar from './TopAppBar';

export default function Layout() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-hidden print:overflow-visible print:bg-white print:text-black">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <main className="ml-64 print:ml-0 flex-1 flex flex-col h-screen print:h-auto relative">
        <div className="print:hidden">
          <TopAppBar />
        </div>
        <div className="mt-16 print:mt-0 p-gutter print:p-0 overflow-y-auto print:overflow-visible flex-1 bg-background print:bg-white">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
