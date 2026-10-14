'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Split, X, Check, RotateCcw } from 'lucide-react';
import { Dataset } from '../types/dataset';
import { sortDataset } from '../utils/transformations';

export interface SplitFileConfig {
  enabled: boolean;
  mode: 'compare' | 'organize';
  variable: string;
  sortBySplit: boolean;
}

interface SplitFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  currentConfig: SplitFileConfig;
  onApplyConfig: (config: SplitFileConfig, updatedDataset?: Dataset) => void;
  lang: 'en' | 'bn';
}

export const SplitFileModal: React.FC<SplitFileModalProps> = ({
  isOpen,
  onClose,
  dataset,
  currentConfig,
  onApplyConfig,
  lang,
}) => {
  const [splitMode, setSplitMode] = useState<'off' | 'compare' | 'organize'>(
    currentConfig.enabled ? currentConfig.mode : 'off'
  );
  const [selectedAvailable, setSelectedAvailable] = useState<string | null>(null);
  const [splitVar, setSplitVar] = useState<string | null>(
    currentConfig.enabled ? currentConfig.variable : null
  );
  const [sortBySplit, setSortBySplit] = useState<boolean>(currentConfig.sortBySplit ?? true);

  useEffect(() => {
    if (isOpen) {
      setSplitMode(currentConfig.enabled ? currentConfig.mode : 'off');
      setSplitVar(currentConfig.enabled ? currentConfig.variable : null);
      setSortBySplit(currentConfig.sortBySplit ?? true);
      setSelectedAvailable(null);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleMoveToSplit = () => {
    if (selectedAvailable) {
      setSplitVar(selectedAvailable);
      setSelectedAvailable(null);
      if (splitMode === 'off') {
        setSplitMode('compare');
      }
    }
  };

  const handleRemoveFromSplit = () => {
    setSplitVar(null);
  };

  const handleApply = () => {
    if (splitMode === 'off' || !splitVar) {
      onApplyConfig({
        enabled: false,
        mode: 'compare',
        variable: '',
        sortBySplit: false,
      });
      onClose();
      return;
    }

    let updatedDs = dataset;
    if (sortBySplit) {
      updatedDs = sortDataset(dataset, splitVar, 'asc');
    }

    onApplyConfig(
      {
        enabled: true,
        mode: splitMode,
        variable: splitVar,
        sortBySplit,
      },
      updatedDs
    );
    onClose();
  };

  const handleReset = () => {
    setSplitMode('off');
    setSplitVar(null);
    setSelectedAvailable(null);
    setSortBySplit(true);
  };

  const isSplitActive = splitMode !== 'off';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-xl text-slate-800 text-xs overflow-hidden flex flex-col font-sans">
        {/* Title Bar */}
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between font-semibold text-gray-800 select-none">
          <div className="flex items-center space-x-2">
            <Split className="w-4 h-4 text-gray-600" />
            <span>
              {lang === 'bn'
                ? 'AutoStat স্প্লিট ফাইল (Split File)'
                : 'AutoStat - Split File'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-4 space-y-4">
          {/* Radio Mode Selection */}
          <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === 'off'}
                onChange={() => {
                  setSplitMode('off');
                  setSplitVar(null);
                }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>
                {lang === 'bn'
                  ? 'সমস্ত কেস একসাথে বিশ্লেষণ করুন (গ্রুপ তৈরি করবেন না)'
                  : 'Analyze all cases, do not create groups'}
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === 'compare'}
                onChange={() => setSplitMode('compare')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>
                {lang === 'bn'
                  ? 'গ্রুপ তুলনা করুন (Compare groups)'
                  : 'Compare groups (Side-by-side output)'}
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === 'organize'}
                onChange={() => setSplitMode('organize')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>
                {lang === 'bn'
                  ? 'গ্রুপ অনুসারে আউটপুট সজ্জিত করুন (Organize output by groups)'
                  : 'Organize output by groups (Separate subgroup tables)'}
              </span>
            </label>
          </div>

          {/* Variable selection shuttle box */}
          <div
            className={`flex gap-3 transition-opacity ${
              isSplitActive ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            {/* Left: Available Variables */}
            <div className="flex-1 flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'ভেরিয়েবল তালিকা:' : 'Variables:'}
              </label>
              <div className="border border-slate-300 rounded bg-white h-44 overflow-y-auto p-1 divide-y divide-slate-100">
                {dataset.columns
                  .filter((c) => c.name !== splitVar)
                  .map((col) => (
                    <div
                      key={col.name}
                      onClick={() => setSelectedAvailable(col.name)}
                      className={`px-2 py-1 cursor-pointer rounded text-xs flex items-center justify-between ${
                        selectedAvailable === col.name
                          ? 'bg-blue-600 text-white font-medium'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{col.label || col.name}</span>
                      <span className="text-[10px] opacity-70 font-mono ml-1">[{col.name}]</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Middle: Transfer Buttons */}
            <div className="flex flex-col justify-center items-center gap-2 self-center">
              <button
                type="button"
                onClick={handleMoveToSplit}
                disabled={!selectedAvailable}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
                title="Add to Groups Based on"
              >
                <ArrowRight className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={handleRemoveFromSplit}
                disabled={!splitVar}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
                title="Remove from Groups Based on"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* Right: Groups Based On */}
            <div className="flex-1 flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'গ্রুপিং ভেরিয়েবল (Groups Based on):' : 'Groups Based on:'}
              </label>
              <div className="border border-slate-300 rounded bg-white h-44 p-2 flex flex-col justify-between">
                {splitVar ? (
                  <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded p-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">
                        {dataset.columns.find((c) => c.name === splitVar)?.label || splitVar}
                      </span>
                      <span className="text-[10px] text-purple-600 font-mono">[{splitVar}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFromSplit}
                      className="text-purple-500 hover:text-red-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-center my-auto">
                    {lang === 'bn'
                      ? 'কোনো গ্রুপিং ভেরিয়েবল নির্বাচিত হয়নি'
                      : 'Select a grouping variable (e.g. Gender, Treatment)'}
                  </div>
                )}

                {/* Sort Option */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={sortBySplit}
                      onChange={(e) => setSortBySplit(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>{lang === 'bn' ? 'ফাইলটি গ্রুপ অনুসারে সর্ট করুন' : 'Sort the file by grouping variables'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Syntax Status Display */}
          <div className="bg-gray-100 border border-gray-300 text-gray-800 rounded p-2 font-mono text-[11px] flex items-center justify-between">
            <span className="text-gray-500">Syntax:</span>
            <span className="text-gray-900 font-semibold font-mono">
              {splitMode === 'off' || !splitVar
                ? 'SPLIT FILE OFF.'
                : splitMode === 'compare'
                ? `SPLIT FILE LAYERED BY ${splitVar}.`
                : `SPLIT FILE SEPARATE BY ${splitVar}.`}
            </span>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-gray-100 px-4 py-2 border-t border-gray-300 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded text-gray-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Reset</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded text-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isSplitActive && !splitVar}
              className="px-5 py-1.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white rounded font-medium shadow-2xs transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
