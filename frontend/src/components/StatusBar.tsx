'use client';

import React from 'react';
import { CheckCircle2, Filter, Layers } from 'lucide-react';

interface StatusBarProps {
  rowCount: number;
  colCount: number;
  activeDatasetName: string;
  lang: 'en' | 'bn';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  rowCount,
  colCount,
  activeDatasetName,
  lang,
}) => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-[11px] px-4 py-1 flex items-center justify-between select-none">
      <div className="flex items-center space-x-4">
        {/* Ready status indicator */}
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span className="font-medium text-slate-300">{lang === 'bn' ? 'প্রস্তুত' : 'Ready'}</span>
        </div>

        <div className="h-3 w-px bg-slate-700" />

        <div className="flex items-center space-x-1 text-slate-400">
          <Filter className="w-3 h-3 text-slate-500" />
          <span>Filters: 0</span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <Layers className="w-3 h-3 text-slate-500" />
          <span>
            {lang === 'bn' ? 'সারি সংখ্যা' : 'Row count'}: <strong className="text-slate-200">{rowCount}</strong>
          </span>
        </div>

        <div className="text-slate-400">
          {lang === 'bn' ? 'কলাম' : 'Columns'}: <strong className="text-slate-200">{colCount}</strong>
        </div>

        <div className="text-slate-400">Filtered: 0</div>
        <div className="text-slate-400">Deleted: 0</div>
      </div>

      <div className="flex items-center space-x-3 text-slate-400 font-mono text-[10px]">
        <span>Engine: spss_core (Rust SIMD)</span>
        <span>•</span>
        <span>{activeDatasetName || 'No Dataset'}</span>
      </div>
    </footer>
  );
};
