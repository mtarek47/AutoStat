'use client';

import React, { useState } from 'react';
import { Filter, X, Play, RotateCcw } from 'lucide-react';
import { Dataset } from '../types/dataset';
import { filterDataset } from '../utils/transformations';

interface SelectCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  originalDataset: Dataset;
  onUpdateDataset: (ds: Dataset) => void;
  onRestoreOriginal: () => void;
  isFiltered: boolean;
  lang: 'en' | 'bn';
}

export const SelectCasesModal: React.FC<SelectCasesModalProps> = ({
  isOpen,
  onClose,
  dataset,
  originalDataset,
  onUpdateDataset,
  onRestoreOriginal,
  isFiltered,
  lang,
}) => {
  const [selectMode, setSelectMode] = useState<'all' | 'condition'>(isFiltered ? 'condition' : 'all');
  const [condition, setCondition] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInsertVariable = (varName: string) => {
    setCondition((prev) => (prev ? `${prev} ${varName}` : varName));
  };

  const handleInsertOperator = (op: string) => {
    setCondition((prev) => `${prev} ${op} `);
  };

  const handleApply = () => {
    setErrorMsg(null);
    if (selectMode === 'all') {
      onRestoreOriginal();
      onClose();
      return;
    }

    if (!condition.trim()) {
      setErrorMsg(lang === 'bn' ? 'শর্ত লিখুন (যেমন: dollars > 1500)' : 'Please specify a condition (e.g. dollars > 1500)');
      return;
    }

    try {
      const result = filterDataset(originalDataset, condition);
      if (result.matchingCount === 0) {
        setErrorMsg(lang === 'bn' ? 'কোনো কেস এই শর্ত পূরণ করেনি (০ টি পাওয়া গেছে)।' : 'No cases satisfied this condition (0 matched).');
        return;
      }
      onUpdateDataset(result.filteredDataset);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Syntax error in condition expression');
    }
  };

  const handleReset = () => {
    setSelectMode('all');
    setCondition('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-xl text-slate-800 text-xs overflow-hidden flex flex-col font-sans">
        {/* Title Bar */}
        <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-semibold text-slate-800 select-none">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'bn' ? 'কেস ফিল্টার করুন (Select Cases)' : 'Select Cases'}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-300 rounded text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-4 space-y-4">
          {/* Radio Options */}
          <div className="space-y-2 bg-white border border-slate-200 p-3 rounded">
            <label className="flex items-center space-x-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="selectMode"
                checked={selectMode === 'all'}
                onChange={() => setSelectMode('all')}
                className="text-blue-600 focus:ring-0"
              />
              <span>{lang === 'bn' ? 'সকল কেস নির্বাচন করুন (All Cases)' : 'All cases (No filter)'}</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer font-medium">
              <input
                type="radio"
                name="selectMode"
                checked={selectMode === 'condition'}
                onChange={() => setSelectMode('condition')}
                className="text-blue-600 focus:ring-0"
              />
              <span>{lang === 'bn' ? 'শর্ত সাপেক্ষে নির্বাচন (If condition is satisfied)' : 'If condition is satisfied'}</span>
            </label>
          </div>

          {selectMode === 'condition' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {/* Column 1: Variables list */}
                <div className="col-span-1">
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    {lang === 'bn' ? 'ভেরিয়েবল ডাবল ক্লিক:' : 'Click to insert var:'}
                  </label>
                  <div className="border border-slate-300 rounded bg-white h-44 overflow-y-auto p-1 divide-y divide-slate-100">
                    {originalDataset.columns.map((col) => (
                      <div
                        key={col.name}
                        onClick={() => handleInsertVariable(col.name)}
                        className="px-2 py-1 cursor-pointer hover:bg-blue-50 text-[11px] rounded flex items-center justify-between"
                        title={col.label}
                      >
                        <span className="font-medium truncate">{col.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{col.type[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2 & 3: Expression & Operator Keypad */}
                <div className="col-span-2 flex flex-col">
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    {lang === 'bn' ? 'ফিল্টার শর্ত এক্সপ্রেশন:' : 'Condition Expression (JS syntax):'}
                  </label>
                  <textarea
                    rows={3}
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. dollars > 1500 && insert == 1"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                  />

                  {/* Keypad */}
                  <div className="grid grid-cols-6 gap-1 bg-slate-50 p-2 rounded border border-slate-200">
                    {['>', '<', '>=', '<=', '==', '!=', '&&', '||', '+', '-', '*', '/'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => handleInsertOperator(op)}
                        className="bg-white border border-slate-300 hover:bg-slate-100 py-1 text-center font-mono font-bold rounded text-xs text-slate-700 shadow-2xs"
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded text-xs">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Status info */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded text-[11px] text-slate-600 flex justify-between items-center">
            <span>
              {lang === 'bn' ? 'বর্তমান সক্রিয় কেস সংখ্যা:' : 'Currently Active Cases:'}{' '}
              <strong className="text-slate-800">{dataset.rows.length}</strong> / {originalDataset.rows.length}
            </span>
            {isFiltered && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-medium">
                Filter: Active
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-2.5 flex items-center justify-end space-x-2 select-none">
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-2xs transition flex items-center space-x-1"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{lang === 'bn' ? 'প্রয়োগ করুন (OK)' : 'OK'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded shadow-2xs transition"
          >
            {lang === 'bn' ? 'রিসেট (Reset)' : 'Reset'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded shadow-2xs transition"
          >
            {lang === 'bn' ? 'বাতিল (Cancel)' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
