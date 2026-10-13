'use client';

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, ArrowUpDown, X } from 'lucide-react';
import { Dataset } from '../types/dataset';
import { sortDataset } from '../utils/transformations';

interface SortCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (ds: Dataset) => void;
  lang: 'en' | 'bn';
}

export const SortCasesModal: React.FC<SortCasesModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  lang,
}) => {
  const [selectedAvailable, setSelectedAvailable] = useState<string | null>(null);
  const [sortVar, setSortVar] = useState<string | null>(null);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  if (!isOpen) return null;

  const handleMoveToSort = () => {
    if (selectedAvailable) {
      setSortVar(selectedAvailable);
      setSelectedAvailable(null);
    }
  };

  const handleRemoveFromSort = () => {
    setSortVar(null);
  };

  const handleExecute = () => {
    if (!sortVar) return;
    const sorted = sortDataset(dataset, sortVar, direction);
    onUpdateDataset(sorted);
    onClose();
  };

  const handleReset = () => {
    setSelectedAvailable(null);
    setSortVar(null);
    setDirection('asc');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-lg text-slate-800 text-xs overflow-hidden flex flex-col font-sans">
        {/* Title bar - Classic SPSS Dialog */}
        <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-semibold text-slate-800 select-none">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-blue-600" />
            <span>{lang === 'bn' ? 'সর্ট কেস (Sort Cases)' : 'Sort Cases'}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-300 rounded text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-4 flex gap-4">
          {/* Left: Available Variables */}
          <div className="flex-1 flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              {lang === 'bn' ? 'ভেরিয়েবল তালিকা:' : 'Variables:'}
            </label>
            <div className="border border-slate-300 rounded bg-white h-52 overflow-y-auto p-1 divide-y divide-slate-100">
              {dataset.columns
                .filter((c) => c.name !== sortVar)
                .map((col) => (
                  <div
                    key={col.name}
                    onClick={() => setSelectedAvailable(col.name)}
                    className={`px-2 py-1.5 cursor-pointer rounded text-xs flex items-center justify-between ${
                      selectedAvailable === col.name
                        ? 'bg-blue-600 text-white font-medium'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{col.label || col.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">[{col.name}]</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Middle: Transfer Buttons */}
          <div className="flex flex-col justify-center items-center gap-2 self-center">
            <button
              onClick={handleMoveToSort}
              disabled={!selectedAvailable}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
              title="Add to Sort by"
            >
              <ArrowRight className="w-4 h-4 text-slate-700" />
            </button>
            <button
              onClick={handleRemoveFromSort}
              disabled={!sortVar}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
              title="Remove"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* Right: Selected Sort Variable & Order */}
          <div className="flex-1 flex flex-col">
            <label className="text-[11px] font-medium text-slate-600 mb-1">
              {lang === 'bn' ? 'সর্ট এর ভেরিয়েবল (Sort by):' : 'Sort by:'}
            </label>
            <div className="border border-slate-300 rounded bg-white h-24 p-2 overflow-y-auto mb-3">
              {sortVar ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded flex items-center justify-between font-medium">
                  <span>{dataset.columns.find((c) => c.name === sortVar)?.label || sortVar}</span>
                  <span className="text-[10px] text-blue-600 font-mono">({sortVar})</span>
                </div>
              ) : (
                <span className="text-slate-400 italic text-[11px]">Select a variable to sort</span>
              )}
            </div>

            {/* Sort Order Radio Group */}
            <fieldset className="border border-slate-300 rounded p-2 bg-slate-50">
              <legend className="text-[10px] font-medium text-slate-600 px-1">
                {lang === 'bn' ? 'সর্ট অর্ডার (Sort Order)' : 'Sort Order'}
              </legend>
              <div className="space-y-1.5 mt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortDir"
                    checked={direction === 'asc'}
                    onChange={() => setDirection('asc')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>{lang === 'bn' ? 'ছোট থেকে বড় (Ascending)' : 'Ascending (A to Z, 0 to 9)'}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortDir"
                    checked={direction === 'desc'}
                    onChange={() => setDirection('desc')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>{lang === 'bn' ? 'বড় থেকে ছোট (Descending)' : 'Descending (Z to A, 9 to 0)'}</span>
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        {/* Footer Buttons - Authentic SPSS layout */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-2.5 flex items-center justify-end space-x-2 select-none">
          <button
            onClick={handleExecute}
            disabled={!sortVar}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded shadow-2xs transition"
          >
            {lang === 'bn' ? 'ঠিক আছে (OK)' : 'OK'}
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
