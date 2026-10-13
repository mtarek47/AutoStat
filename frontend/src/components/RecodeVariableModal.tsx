'use client';

import React, { useState } from 'react';
import { Split, X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Dataset } from '../types/dataset';
import { recodeIntoDifferentVariable, RecodeRule } from '../utils/transformations';

interface RecodeVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (ds: Dataset) => void;
  lang: 'en' | 'bn';
}

export const RecodeVariableModal: React.FC<RecodeVariableModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  lang,
}) => {
  const [sourceVar, setSourceVar] = useState<string>(dataset.columns[0]?.name || '');
  const [targetName, setTargetName] = useState<string>('');
  const [targetLabel, setTargetLabel] = useState<string>('');
  const [rules, setRules] = useState<RecodeRule[]>([]);

  // Rule builder inputs
  const [ruleType, setRuleType] = useState<'exact' | 'range' | 'else'>('exact');
  const [exactOld, setExactOld] = useState<string>('');
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');
  const [newVal, setNewVal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (newVal === '') {
      setErrorMsg(lang === 'bn' ? 'নতুন মান (New Value) লিখুন।' : 'Please specify a new value.');
      return;
    }

    if (ruleType === 'exact') {
      if (exactOld === '') {
        setErrorMsg('Please specify the old value.');
        return;
      }
      setRules([...rules, { type: 'exact', oldValue: exactOld, newValue: Number(newVal) || newVal }]);
      setExactOld('');
      setNewVal('');
    } else if (ruleType === 'range') {
      const min = Number(rangeMin);
      const max = Number(rangeMax);
      if (isNaN(min) || isNaN(max)) {
        setErrorMsg('Please specify valid numbers for range min and max.');
        return;
      }
      setRules([
        ...rules,
        { type: 'range', rangeMin: min, rangeMax: max, newValue: Number(newVal) || newVal },
      ]);
      setRangeMin('');
      setRangeMax('');
      setNewVal('');
    } else if (ruleType === 'else') {
      setRules([...rules, { type: 'else', newValue: Number(newVal) || newVal }]);
      setNewVal('');
    }
    setErrorMsg(null);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, idx) => idx !== index));
  };

  const handleExecute = () => {
    if (!sourceVar) {
      setErrorMsg('Select a source variable.');
      return;
    }
    if (!targetName.trim()) {
      setErrorMsg('Enter an output variable name.');
      return;
    }
    if (rules.length === 0) {
      setErrorMsg('Add at least one Old -> New recoding rule.');
      return;
    }

    const updated = recodeIntoDifferentVariable(
      dataset,
      sourceVar,
      targetName.trim(),
      targetLabel.trim() || targetName.trim(),
      rules
    );

    onUpdateDataset(updated);
    onClose();
  };

  const handleReset = () => {
    setTargetName('');
    setTargetLabel('');
    setRules([]);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-2xl text-slate-800 text-xs overflow-hidden flex flex-col font-sans">
        {/* Title */}
        <div className="bg-slate-200 px-3 py-2 border-b border-slate-300 flex items-center justify-between font-semibold text-slate-800 select-none">
          <div className="flex items-center space-x-2">
            <Split className="w-4 h-4 text-purple-600" />
            <span>
              {lang === 'bn'
                ? 'রীকোড (Recode into Different Variables)'
                : 'Recode into Different Variables'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-300 rounded text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Input & Output Config */}
            <div className="space-y-3 bg-white border border-slate-200 p-3 rounded">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {lang === 'bn' ? 'মূল ভেরিয়েবল (Input Variable):' : 'Input Variable:'}
                </label>
                <select
                  value={sourceVar}
                  onChange={(e) => setSourceVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {dataset.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.label || c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {lang === 'bn' ? 'নতুন ভেরিয়েবলের নাম (Output Name):' : 'Output Variable Name:'}
                </label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. promo_group"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {lang === 'bn' ? 'নতুন ভেরিয়েবলের লেবেল (Label):' : 'Output Variable Label:'}
                </label>
                <input
                  type="text"
                  value={targetLabel}
                  onChange={(e) => setTargetLabel(e.target.value)}
                  placeholder="e.g. Recoded Promotion Group"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Old and New Values Rules Definition */}
            <div className="space-y-3 bg-white border border-slate-200 p-3 rounded flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-[11px] text-slate-700 mb-2 border-b pb-1">
                  {lang === 'bn' ? 'পুরাতন ও নতুন মান (Old & New Values):' : 'Define Old & New Values:'}
                </h4>

                <div className="space-y-1.5 mb-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ruleType"
                      checked={ruleType === 'exact'}
                      onChange={() => setRuleType('exact')}
                    />
                    <span>Value:</span>
                    <input
                      type="text"
                      disabled={ruleType !== 'exact'}
                      value={exactOld}
                      onChange={(e) => setExactOld(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-xs disabled:bg-slate-100"
                    />
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ruleType"
                      checked={ruleType === 'range'}
                      onChange={() => setRuleType('range')}
                    />
                    <span>Range:</span>
                    <input
                      type="text"
                      disabled={ruleType !== 'range'}
                      value={rangeMin}
                      onChange={(e) => setRangeMin(e.target.value)}
                      placeholder="Min"
                      className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs disabled:bg-slate-100"
                    />
                    <span>thru</span>
                    <input
                      type="text"
                      disabled={ruleType !== 'range'}
                      value={rangeMax}
                      onChange={(e) => setRangeMax(e.target.value)}
                      placeholder="Max"
                      className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs disabled:bg-slate-100"
                    />
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ruleType"
                      checked={ruleType === 'else'}
                      onChange={() => setRuleType('else')}
                    />
                    <span>All other values (ELSE)</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <span className="font-semibold">New value:</span>
                  <input
                    type="text"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-24 border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                  <button
                    onClick={handleAddRule}
                    type="button"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recode Rules List */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              {lang === 'bn' ? 'সক্রিয় রুলস তালিকা (Old -> New):' : 'Old --> New Rules Specification:'}
            </label>
            <div className="border border-slate-300 rounded bg-white h-28 overflow-y-auto p-1 divide-y divide-slate-100">
              {rules.length === 0 ? (
                <div className="text-slate-400 italic text-center py-4">
                  No mapping rules defined yet. Add rules above.
                </div>
              ) : (
                rules.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1 hover:bg-slate-50">
                    <span className="font-mono text-xs">
                      {r.type === 'exact' && `${r.oldValue} ➔ ${r.newValue}`}
                      {r.type === 'range' && `${r.rangeMin} THRU ${r.rangeMax} ➔ ${r.newValue}`}
                      {r.type === 'else' && `ELSE ➔ ${r.newValue}`}
                    </span>
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-2.5 flex items-center justify-end space-x-2 select-none">
          <button
            onClick={handleExecute}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded shadow-2xs transition"
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
