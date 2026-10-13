'use client';

import React, { useState } from 'react';
import { X, Calculator, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Dataset, ColumnMetadata } from '../types/dataset';

interface ComputeVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  lang: 'en' | 'bn';
}

export const ComputeVariableModal: React.FC<ComputeVariableModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  lang,
}) => {
  const [targetVariable, setTargetVariable] = useState('');
  const [targetLabel, setTargetLabel] = useState('');
  const [expression, setExpression] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const insertToken = (token: string) => {
    setExpression((prev) => prev + token);
  };

  const handleCompute = () => {
    setErrorMsg(null);
    const varName = targetVariable.trim().replace(/\s+/g, '_');
    if (!varName) {
      setErrorMsg(lang === 'bn' ? 'টার্গেট ভেরিয়েবলের নাম দিন।' : 'Target variable name is required.');
      return;
    }
    if (!expression.trim()) {
      setErrorMsg(lang === 'bn' ? 'ম্যাথমেটিক্যাল ফর্মুলা লিখুন।' : 'Expression is required.');
      return;
    }

    try {
      // Evaluate expression for each row safely
      const updatedRows = dataset.rows.map((row) => {
        // Build scope with row variables
        const scope: Record<string, number> = {};
        dataset.columns.forEach((col) => {
          const val = row[col.name];
          scope[col.name] = typeof val === 'number' ? val : parseFloat(val) || 0;
        });

        // Safe evaluation helper
        let sanitizedExpr = expression;
        sanitizedExpr = sanitizedExpr.replace(/\bsqrt\b/gi, 'Math.sqrt');
        sanitizedExpr = sanitizedExpr.replace(/\blog\b/gi, 'Math.log');
        sanitizedExpr = sanitizedExpr.replace(/\babs\b/gi, 'Math.abs');
        sanitizedExpr = sanitizedExpr.replace(/\bround\b/gi, 'Math.round');
        sanitizedExpr = sanitizedExpr.replace(/\bexp\b/gi, 'Math.exp');

        // Replace variable identifiers with scope['varName']
        dataset.columns.forEach((col) => {
          const regex = new RegExp(`\\b${col.name}\\b`, 'g');
          sanitizedExpr = sanitizedExpr.replace(regex, `scope['${col.name}']`);
        });

        // Evaluate using safe Function constructor with limited scope
        const evalFn = new Function('scope', `return (${sanitizedExpr});`);
        const result = evalFn(scope);
        const numRes = typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : 0;

        return {
          ...row,
          [varName]: numRes,
        };
      });

      const newColumn: ColumnMetadata = {
        name: varName,
        label: targetLabel.trim() || varName,
        type: 'numeric',
        measure: 'scale',
        role: 'target',
        decimals: 2,
        width: 10,
        align: 'right',
      };

      const existingIndex = dataset.columns.findIndex((c) => c.name === varName);
      let updatedColumns = [...dataset.columns];
      if (existingIndex >= 0) {
        updatedColumns[existingIndex] = newColumn;
      } else {
        updatedColumns.push(newColumn);
      }

      onUpdateDataset({
        ...dataset,
        columns: updatedColumns,
        rows: updatedRows,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(`Formula Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Window Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm">
              {lang === 'bn' ? 'Compute Variable (ফর্মুলা ট্রান্সফর্মেশন)' : 'Compute Variable'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Inputs: Target Variable Name & Label */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Variable:
              </label>
              <input
                type="text"
                placeholder="e.g. total_score, bmi, z_dollars"
                value={targetVariable}
                onChange={(e) => setTargetVariable(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Label (Description):
              </label>
              <input
                type="text"
                placeholder="e.g. Total Calculated Score"
                value={targetLabel}
                onChange={(e) => setTargetLabel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Expression Editor & Keypad */}
          <div className="grid grid-cols-3 gap-4">
            {/* Variable list */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Variables:</label>
              <div className="border border-slate-200 rounded-lg p-2 max-h-44 overflow-y-auto bg-slate-50 space-y-1">
                {dataset.columns.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => insertToken(` ${c.name} `)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-blue-100 text-slate-800 font-mono text-[11px] truncate flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Expression Box & Keypad */}
            <div className="col-span-2 space-y-2">
              <label className="block font-semibold text-slate-700">Numeric Expression:</label>
              <textarea
                rows={3}
                placeholder="e.g. dollars * 1.15 or sepal_length + sepal_width"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              />

              {/* Calculator Keypad buttons */}
              <div className="grid grid-cols-6 gap-1 bg-slate-100 p-2 rounded-lg border border-slate-200 text-center font-mono">
                {['+', '-', '*', '/', '(', ')', '^', 'sqrt(', 'log(', 'abs(', 'round(', 'clear'].map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      if (op === 'clear') setExpression('');
                      else if (op === '^') insertToken(' ** ');
                      else insertToken(` ${op} `);
                    }}
                    className="bg-white hover:bg-slate-200 text-slate-800 py-1 rounded shadow-2xs font-semibold text-xs transition"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setTargetVariable('');
              setTargetLabel('');
              setExpression('');
            }}
            className="px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleCompute}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-1.5 rounded-lg shadow-md shadow-blue-500/20 transition flex items-center space-x-1"
          >
            <Check className="w-4 h-4" />
            <span>OK (Compute)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
