'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Scale, X, RotateCcw } from 'lucide-react';
import { Dataset } from '../types/dataset';

export interface WeightCasesConfig {
  enabled: boolean;
  variable: string | null;
}

interface WeightCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  currentConfig: WeightCasesConfig;
  onApplyConfig: (config: WeightCasesConfig) => void;
  lang: 'en' | 'bn';
}

export const WeightCasesModal: React.FC<WeightCasesModalProps> = ({
  isOpen,
  onClose,
  dataset,
  currentConfig,
  onApplyConfig,
  lang,
}) => {
  const [weightMode, setWeightMode] = useState<'off' | 'on'>(
    currentConfig.enabled ? 'on' : 'off'
  );
  const [selectedAvailable, setSelectedAvailable] = useState<string | null>(null);
  const [weightVar, setWeightVar] = useState<string | null>(
    currentConfig.enabled ? currentConfig.variable : null
  );

  useEffect(() => {
    if (isOpen) {
      setWeightMode(currentConfig.enabled ? 'on' : 'off');
      setWeightVar(currentConfig.enabled ? currentConfig.variable : null);
      setSelectedAvailable(null);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleMoveToWeight = () => {
    if (selectedAvailable) {
      setWeightVar(selectedAvailable);
      setSelectedAvailable(null);
      setWeightMode('on');
    }
  };

  const handleRemoveFromWeight = () => {
    setWeightVar(null);
  };

  const handleApply = () => {
    if (weightMode === 'off' || !weightVar) {
      onApplyConfig({
        enabled: false,
        variable: null,
      });
      onClose();
      return;
    }

    onApplyConfig({
      enabled: true,
      variable: weightVar,
    });
    onClose();
  };

  const handleReset = () => {
    setWeightMode('off');
    setWeightVar(null);
    setSelectedAvailable(null);
  };

  const isWeightActive = weightMode === 'on';

  // Filter numeric candidates for weighting
  const numericColumns = dataset.columns.filter(
    (c) => c.type === 'numeric' || c.type === 'dollar' || c.measure === 'scale'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-xl text-slate-800 text-xs overflow-hidden flex flex-col font-sans">
        {/* Title Bar */}
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between font-semibold text-gray-800 select-none">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-gray-600" />
            <span>
              {lang === 'bn'
                ? 'AutoStat ওয়েট কেস (Weight Cases)'
                : 'AutoStat - Weight Cases'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-4 space-y-4">
          {/* Mode Selection */}
          <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
              <input
                type="radio"
                name="weightMode"
                checked={weightMode === 'off'}
                onChange={() => {
                  setWeightMode('off');
                  setWeightVar(null);
                }}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>
                {lang === 'bn'
                  ? 'কেসগুলোতে কোনো ওজন প্রয়োগ করবেন না (Do not weight cases)'
                  : 'Do not weight cases'}
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-700">
              <input
                type="radio"
                name="weightMode"
                checked={weightMode === 'on'}
                onChange={() => setWeightMode('on')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>
                {lang === 'bn'
                  ? 'নির্দিষ্ট ভেরিয়েবল অনুসারে কেস ওজন করুন (Weight cases by)'
                  : 'Weight cases by frequency variable'}
              </span>
            </label>
          </div>

          {/* Variables shuttle box */}
          <div
            className={`flex gap-3 transition-opacity ${
              isWeightActive ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            {/* Left: Available Variables */}
            <div className="flex-1 flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'সাংখ্যিক ভেরিয়েবল (Numeric Variables):' : 'Variables:'}
              </label>
              <div className="border border-slate-300 rounded bg-white h-44 overflow-y-auto p-1 divide-y divide-slate-100">
                {numericColumns
                  .filter((c) => c.name !== weightVar)
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
                onClick={handleMoveToWeight}
                disabled={!selectedAvailable}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
                title="Designate as Frequency Variable"
              >
                <ArrowRight className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={handleRemoveFromWeight}
                disabled={!weightVar}
                className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-200 disabled:opacity-40 transition shadow-2xs"
                title="Remove Frequency Variable"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* Right: Frequency Variable */}
            <div className="flex-1 flex flex-col">
              <label className="text-[11px] font-semibold text-slate-600 mb-1">
                {lang === 'bn' ? 'ফ্রিকোয়েন্সি ভেরিয়েবল (Frequency Variable):' : 'Frequency Variable:'}
              </label>
              <div className="border border-slate-300 rounded bg-white h-44 p-2 flex flex-col justify-between">
                {weightVar ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded p-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">
                        {dataset.columns.find((c) => c.name === weightVar)?.label || weightVar}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-mono">[{weightVar}]</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFromWeight}
                      className="text-emerald-500 hover:text-red-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-center my-auto">
                    {lang === 'bn'
                      ? 'কোনো ফ্রিকোয়েন্সি ভেরিয়েবল নির্বাচন করা হয়নি'
                      : 'Select a frequency / replication weight variable'}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  Case replication and survey frequency weighting
                </div>
              </div>
            </div>
          </div>

          {/* Syntax Status Display */}
          <div className="bg-gray-100 border border-gray-300 text-gray-800 rounded p-2 font-mono text-[11px] flex items-center justify-between">
            <span className="text-gray-500">Syntax:</span>
            <span className="text-gray-900 font-semibold font-mono">
              {weightMode === 'off' || !weightVar
                ? 'WEIGHT OFF.'
                : `WEIGHT BY ${weightVar}.`}
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
              disabled={isWeightActive && !weightVar}
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
