'use client';

import React from 'react';
import {
  BarChart3,
  Database,
  Table,
  Upload,
  Sparkles,
  Globe,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'upload' | 'editor' | 'analysis';
  setActiveTab: (tab: 'upload' | 'editor' | 'analysis') => void;
  datasetName: string;
  lang: 'en' | 'bn';
  setLang: (lang: 'en' | 'bn') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  datasetName,
  lang,
  setLang,
}) => {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 select-none">
      {/* Top OS Window Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-slate-400 font-medium tracking-wide">
            AutoStat Statistics Suite • {datasetName || (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No dataset loaded')}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Active Dataset Pill */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 text-emerald-400 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Active: [{datasetName || 'None'}]</span>
          </div>

          {/* Bilingual Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition text-[11px] font-medium"
            title="Toggle Language / ভাষা পরিবর্তন"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          <Bell className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200 cursor-pointer" />
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/70">
        <div className="flex items-center space-x-1">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-2 mr-6 py-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight text-white tracking-tight flex items-center gap-1.5">
                <span>AutoStat Platform</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-mono border border-blue-500/30">
                  Rust-Core
                </span>
              </div>
              <div className="text-[10px] text-slate-400 leading-none">
                {lang === 'bn' ? 'এআই-পাওয়ার্ড পরিসংখ্যান গবেষণা সহকারী' : 'AI-Powered Research & Statistical Engine'}
              </div>
            </div>
          </div>

          {/* App Views Tabs */}
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? '১-ক্লিক আপলোড' : 'One-Click Upload'}</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ডেটা এডিটর ও ভেরিয়েবল' : 'Data Editor & Variables'}</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'অ্যানালাইসিস ও রিপোর্ট' : 'Statistical Analysis & Reports'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
