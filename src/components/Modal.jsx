import React from 'react';

export default function Modal({ isOpen, onClose, title, icon, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className={`bg-surface-container-lowest rounded-xl shadow-lg border border-surface-variant w-full ${maxWidth} mx-4 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface shrink-0">
          <h3 className="font-h3 text-[18px] text-on-surface flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
            {title}
          </h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
