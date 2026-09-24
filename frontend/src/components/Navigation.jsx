import React from 'react';
import { Database, HelpCircle } from "lucide-react";

export default function Navigation({ currentPage, onNavigate, onOpenHelp }) {
  return (
    <nav className="w-full bg-surface border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
        <img src="/cleaniq_logo.svg" alt="CleanIQ Favicon" className="w-10 h-10 shadow-sm transition-transform group-hover:scale-105" />
        <div className="flex flex-col justify-center">
            <span className="text-2xl font-black tracking-tight text-slate-800 leading-none">
              Clean<span className="text-[#0ea5e9]">IQ</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Intelligent Data Cleaning
            </span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
        <button 
          onClick={() => onNavigate('dashboard')} 
          className={`transition-colors ${currentPage === 'dashboard' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}`}>
          Workspace
        </button>
        <button 
          onClick={() => onNavigate('history')} 
          className={`transition-colors ${currentPage === 'history' ? 'text-primary-600 font-bold' : 'hover:text-primary-600'}`}>
          History
        </button>
        <button 
          onClick={onOpenHelp} 
          className="flex items-center gap-1 hover:text-primary-600 transition-colors">
          <HelpCircle size={16} /> Help
        </button>
      </div>
    </nav>
  );
}
