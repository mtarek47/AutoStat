'use client';

import React from 'react';
import { Filter, Layers, Split, Scale } from 'lucide-react';

interface StatusBarProps {
  rowCount: number;
  colCount: number;
  activeDatasetName: string;
  lang: 'en' | 'bn';
  isFiltered?: boolean;
  splitVar?: string | null;
  weightVar?: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  rowCount,
  colCount,
  activeDatasetName,
  lang,
  isFiltered = false,
  splitVar = null,
  weightVar = null,
}) => {
  return (
    <footer className="bg-gray-100 border-t border-gray-300 text-gray-600 text-[11px] px-4 py-1 flex items-center justify-between select-none">
      <div className="flex items-center space-x-3.5">
        {/* AutoStat Processor is ready indicator */}
        <div className="flex items-center space-x-1.5 text-gray-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="font-medium text-gray-800">
            {lang === 'bn' ? 'AutoStat প্রসেসর প্রস্তুত' : 'AutoStat Processor is ready'}
          </span>
        </div>

        <div className="h-3 w-px bg-gray-300" />

        {/* Row count & Col count */}
        <div className="flex items-center space-x-1 text-gray-600">
          <Layers className="w-3 h-3 text-gray-400" />
          <span>
            {lang === 'bn' ? 'কেস সংখ্যা' : 'Cases'}: <strong className="text-gray-900">{rowCount}</strong>
          </span>
        </div>

        <div className="text-gray-600">
          {lang === 'bn' ? 'ভেরিয়েবল' : 'Variables'}: <strong className="text-gray-900">{colCount}</strong>
        </div>

        <div className="h-3 w-px bg-gray-300" />

        {/* Filter Indicator */}
        <div className="flex items-center space-x-1 font-mono">
          <Filter className={`w-3 h-3 ${isFiltered ? 'text-gray-900' : 'text-gray-400'}`} />
          <span className={isFiltered ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
            Filter: {isFiltered ? 'On' : 'Off'}
          </span>
        </div>

        {/* Weight Indicator */}
        <div className="flex items-center space-x-1 font-mono">
          <Scale className={`w-3 h-3 ${weightVar ? 'text-gray-900' : 'text-gray-400'}`} />
          <span className={weightVar ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
            Weight: {weightVar ? weightVar : 'Off'}
          </span>
        </div>

        {/* Split File Indicator */}
        <div className="flex items-center space-x-1 font-mono">
          <Split className={`w-3 h-3 ${splitVar ? 'text-gray-900' : 'text-gray-400'}`} />
          <span className={splitVar ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
            Split: {splitVar ? splitVar : 'Off'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-gray-500 font-mono text-[10px]">
        <span>Engine: AutoStat Core (Rust + Python)</span>
        <span>•</span>
        <span>{activeDatasetName || 'No Dataset'}</span>
      </div>
    </footer>
  );
};
