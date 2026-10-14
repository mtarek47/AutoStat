'use client';

import React, { useState } from 'react';
import {
  Plus,
  SlidersHorizontal,
  X,
  Check,
  Ruler,
  BarChart2,
  PieChart,
  LayoutGrid,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import {
  Dataset,
  ColumnMetadata,
  VariableMeasure,
  VariableRole,
  VariableType,
  VariableAlign,
} from '../types/dataset';

interface DataEditorViewProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onNavigateToAnalysis: () => void;
  lang: 'en' | 'bn';
  editorMode?: 'data' | 'variable';
  setEditorMode?: (mode: 'data' | 'variable') => void;
  showLabels?: boolean;
  setShowLabels?: (val: boolean) => void;
}

export const DataEditorView: React.FC<DataEditorViewProps> = ({
  dataset,
  onUpdateDataset,
  onNavigateToAnalysis,
  lang,
  editorMode: externalEditorMode,
  setEditorMode: externalSetEditorMode,
  showLabels: externalShowLabels,
  setShowLabels: externalSetShowLabels,
}) => {
  const [internalMode, setInternalMode] = useState<'data' | 'variable'>('data');
  const [internalShowLabels, setInternalShowLabels] = useState<boolean>(true);

  const editorMode = externalEditorMode ?? internalMode;
  const setEditorMode = externalSetEditorMode ?? setInternalMode;
  const showLabels = externalShowLabels ?? internalShowLabels;
  const setShowLabels = externalSetShowLabels ?? setInternalShowLabels;

  const [selectedColumnName, setSelectedColumnName] = useState<string>(
    dataset.columns[0]?.name || ''
  );
  const [showVariableSidebar, setShowVariableSidebar] = useState<boolean>(true);

  const selectedColumn =
    dataset.columns.find((c) => c.name === selectedColumnName) || dataset.columns[0];
  const [editMeta, setEditMeta] = useState<ColumnMetadata>(selectedColumn);

  const handleSelectColumn = (colName: string) => {
    setSelectedColumnName(colName);
    const col = dataset.columns.find((c) => c.name === colName);
    if (col) {
      setEditMeta({ ...col });
      setShowVariableSidebar(true);
    }
  };

  const handleApplyMeta = () => {
    const updatedColumns = dataset.columns.map((c) =>
      c.name === editMeta.name ? { ...editMeta } : c
    );
    onUpdateDataset({
      ...dataset,
      columns: updatedColumns,
    });
  };

  const handleCellChange = (rowIndex: number, colName: string, value: any) => {
    const updatedRows = [...dataset.rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [colName]: value,
    };
    onUpdateDataset({
      ...dataset,
      rows: updatedRows,
    });
  };

  const handleUpdateVariableField = (colName: string, field: keyof ColumnMetadata, value: any) => {
    const updatedColumns = dataset.columns.map((c) => {
      if (c.name === colName) {
        return { ...c, [field]: value };
      }
      return c;
    });
    onUpdateDataset({
      ...dataset,
      columns: updatedColumns,
    });
  };

  const handleAddNewVariable = () => {
    const newName = `var_${dataset.columns.length + 1}`;
    const newCol: ColumnMetadata = {
      name: newName,
      label: `New Variable ${dataset.columns.length + 1}`,
      type: 'numeric',
      measure: 'scale',
      role: 'input',
      decimals: 2,
      width: 8,
      align: 'right',
    };
    const updatedRows = dataset.rows.map((r) => ({
      ...r,
      [newName]: 0,
    }));
    onUpdateDataset({
      ...dataset,
      columns: [...dataset.columns, newCol],
      rows: updatedRows,
    });
    setSelectedColumnName(newName);
    setEditMeta(newCol);
  };

  const handleDeleteVariable = (colName: string) => {
    if (dataset.columns.length <= 1) return;
    const updatedColumns = dataset.columns.filter((c) => c.name !== colName);
    const updatedRows = dataset.rows.map((r) => {
      const copy = { ...r };
      delete copy[colName];
      return copy;
    });
    onUpdateDataset({
      ...dataset,
      columns: updatedColumns,
      rows: updatedRows,
    });
    if (selectedColumnName === colName) {
      setSelectedColumnName(updatedColumns[0].name);
      setEditMeta(updatedColumns[0]);
    }
  };

  const formatCellValue = (val: any, col: ColumnMetadata): string => {
    if (val === null || val === undefined) return '';

    // If Value Labels are ON and column has valueLabels mapping
    if (showLabels && col.valueLabels) {
      const strVal = String(val);
      if (col.valueLabels[strVal]) {
        return col.valueLabels[strVal];
      }
    }

    if (col.type === 'dollar' && typeof val === 'number') {
      return `$${val.toLocaleString('en-US', {
        minimumFractionDigits: col.decimals ?? 2,
        maximumFractionDigits: col.decimals ?? 2,
      })}`;
    }

    if (col.type === 'numeric' && typeof val === 'number') {
      const dec = col.decimals ?? 2;
      return val.toFixed(dec);
    }

    return String(val);
  };

  const getMeasureIcon = (m: VariableMeasure) => {
    switch (m) {
      case 'scale':
        return (
          <span title="Scale (Continuous Metric)">
            <Ruler className="w-3.5 h-3.5 text-gray-500" />
          </span>
        );
      case 'ordinal':
        return (
          <span title="Ordinal (Ranked Categorical)">
            <BarChart2 className="w-3.5 h-3.5 text-gray-500" />
          </span>
        );
      case 'nominal':
      default:
        return (
          <span title="Nominal (Categorical / Discrete)">
            <PieChart className="w-3.5 h-3.5 text-gray-500" />
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden select-none">
      {/* AutoStat Cell Formula / Value Bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-3 py-1 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-2">
          {/* Cell Coordinates indicator like `1 : id` */}
          <div className="bg-white border border-gray-300 rounded px-2.5 py-0.5 font-mono text-[11px] font-semibold text-gray-700 min-w-[70px] text-center shadow-2xs">
            {editorMode === 'data'
              ? `1 : ${selectedColumnName || 'var'}`
              : `${dataset.columns.findIndex((c) => c.name === selectedColumnName) + 1} : ${
                  selectedColumnName || 'var'
                }`}
          </div>
          <div className="text-gray-400 font-serif italic text-xs">fx</div>
          <div className="bg-white border border-gray-300 rounded px-2.5 py-0.5 text-xs text-gray-800 font-mono min-w-[220px] shadow-2xs">
            {editorMode === 'data'
              ? String(dataset.rows[0]?.[selectedColumnName] ?? '')
              : selectedColumn?.label || selectedColumn?.name || ''}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {editorMode === 'variable' && (
            <button
              onClick={handleAddNewVariable}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium transition text-xs shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600" />
              <span>{lang === 'bn' ? '+ নতুন ভেরিয়েবল' : '+ Add Variable'}</span>
            </button>
          )}
          <button
            onClick={() => setShowVariableSidebar(!showVariableSidebar)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded border transition font-medium text-xs shadow-2xs ${
              showVariableSidebar
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showVariableSidebar ? 'Hide Info' : 'Variable Info'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table & Bottom Sheet Tabs Container */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
          {/* VIEW 1: DATA VIEW (SPREADSHEET OF CASES) */}
          {editorMode === 'data' && (
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full border-collapse text-xs text-left">
                <thead className="sticky top-0 bg-gray-100 border-b border-gray-300 shadow-2xs z-10">
                  <tr>
                    <th className="w-12 px-2 py-2 border-r border-gray-200 text-center font-semibold text-gray-400 bg-gray-100">
                      #
                    </th>
                    {dataset.columns.map((col) => {
                      const isSelected = selectedColumnName === col.name;
                      return (
                        <th
                          key={col.name}
                          onClick={() => handleSelectColumn(col.name)}
                          className={`px-3 py-2 border-r border-gray-200 font-semibold cursor-pointer transition min-w-[140px] ${
                            isSelected
                              ? 'bg-gray-200/90 text-gray-900 border-b-2 border-b-gray-800'
                              : 'text-gray-700 hover:bg-gray-200/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{col.label || col.name}</span>
                            <div className="ml-1.5">{getMeasureIcon(col.measure)}</div>
                          </div>
                          <div className="text-[10px] text-gray-400 font-normal uppercase">
                            {col.type} • {col.measure}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-gray-50 border-b border-gray-100 group">
                      <td className="px-2 py-1.5 border-r border-gray-200 text-center font-mono text-[11px] text-gray-400 bg-gray-50 group-hover:bg-gray-100">
                        {rIdx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const isSelectedCol = selectedColumnName === col.name;
                        const cellVal = row[col.name];
                        return (
                          <td
                            key={col.name}
                            className={`px-3 py-1.5 border-r border-gray-100 font-mono text-gray-800 ${
                              isSelectedCol ? 'bg-gray-100/60' : ''
                            }`}
                          >
                            <input
                              type="text"
                              value={formatCellValue(cellVal, col)}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed =
                                  col.type === 'numeric' || col.type === 'dollar'
                                    ? parseFloat(raw.replace(/[$,]/g, '')) || 0
                                    : raw;
                                handleCellChange(rIdx, col.name, parsed);
                              }}
                              className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:bg-white rounded px-1 py-0.5 text-xs text-gray-800"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: VARIABLE VIEW (VARIABLE METADATA TABLE) */}
          {editorMode === 'variable' && (
            <div className="flex-1 overflow-auto bg-white border-r border-gray-200">
              <table className="w-full border-collapse text-xs text-left">
                <thead className="sticky top-0 bg-gray-100 border-b border-gray-300 shadow-2xs z-10 text-gray-700 font-semibold">
                  <tr>
                    <th className="w-10 px-2 py-2 border-r border-gray-200 text-center bg-gray-100">
                      #
                    </th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[120px]">Name</th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[100px]">Type</th>
                    <th className="px-3 py-2 border-r border-gray-200 w-20">Width</th>
                    <th className="px-3 py-2 border-r border-gray-200 w-20">Decimals</th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[200px]">Label</th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[100px]">Align</th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[120px]">Measure</th>
                    <th className="px-3 py-2 border-r border-gray-200 min-w-[110px]">Role</th>
                    <th className="px-3 py-2 border-r border-gray-200 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.columns.map((col, idx) => {
                    const isSelected = selectedColumnName === col.name;
                    return (
                      <tr
                        key={col.name}
                        onClick={() => handleSelectColumn(col.name)}
                        className={`hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${
                          isSelected ? 'bg-gray-100/70' : ''
                        }`}
                      >
                        <td className="px-2 py-2 border-r border-gray-200 text-center font-mono text-[11px] text-gray-400 bg-gray-50">
                          {idx + 1}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-1.5 border-r border-gray-100 font-mono font-semibold text-gray-900">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) =>
                              handleUpdateVariableField(col.name, 'name', e.target.value)
                            }
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 text-xs"
                          />
                        </td>

                        {/* Type Dropdown */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <select
                            value={col.type}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'type',
                                e.target.value as VariableType
                              )
                            }
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800"
                          >
                            <option value="numeric">Numeric</option>
                            <option value="dollar">Dollar ($)</option>
                            <option value="string">String</option>
                            <option value="date">Date</option>
                          </select>
                        </td>

                        {/* Width */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <input
                            type="number"
                            value={col.width}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'width',
                                parseInt(e.target.value) || 8
                              )
                            }
                            className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800"
                          />
                        </td>

                        {/* Decimals */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={col.decimals}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'decimals',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800"
                          />
                        </td>

                        {/* Label */}
                        <td className="px-3 py-1.5 border-r border-gray-100 text-gray-800">
                          <input
                            type="text"
                            value={col.label}
                            onChange={(e) =>
                              handleUpdateVariableField(col.name, 'label', e.target.value)
                            }
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded px-1 text-xs"
                          />
                        </td>

                        {/* Align */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <select
                            value={col.align || 'right'}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'align',
                                e.target.value as VariableAlign
                              )
                            }
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800"
                          >
                            <option value="right">Right</option>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                          </select>
                        </td>

                        {/* Measure */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <select
                            value={col.measure}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'measure',
                                e.target.value as VariableMeasure
                              )
                            }
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800 font-medium"
                          >
                            <option value="scale">Scale (Metric)</option>
                            <option value="ordinal">Ordinal (Rank)</option>
                            <option value="nominal">Nominal (Cat)</option>
                          </select>
                        </td>

                        {/* Role */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <select
                            value={col.role}
                            onChange={(e) =>
                              handleUpdateVariableField(
                                col.name,
                                'role',
                                e.target.value as VariableRole
                              )
                            }
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800"
                          >
                            <option value="input">Input</option>
                            <option value="target">Target</option>
                            <option value="both">Both</option>
                            <option value="none">None</option>
                          </select>
                        </td>

                        {/* Action */}
                        <td className="px-3 py-1.5 border-r border-gray-100 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVariable(col.name);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                            title="Delete Variable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* AutoStat Bottom Sheet Tabs */}
          <div className="flex items-center bg-gray-200 border-t border-gray-300 px-3 pt-1 text-xs select-none shadow-xs z-10 gap-1">
            <button
              onClick={() => setEditorMode('data')}
              className={`px-3 py-1 font-medium text-xs transition flex items-center space-x-1.5 rounded-t ${
                editorMode === 'data'
                  ? 'bg-white border-t-2 border-t-gray-800 border-x border-gray-300 text-gray-900 shadow-2xs font-bold'
                  : 'bg-gray-200 border-t-2 border-transparent text-gray-600 hover:bg-gray-300 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'Data View (ডেটা ভিউ)' : 'Data View'}</span>
            </button>
            <button
              onClick={() => setEditorMode('variable')}
              className={`px-3 py-1 font-medium text-xs transition flex items-center space-x-1.5 rounded-t ${
                editorMode === 'variable'
                  ? 'bg-white border-t-2 border-t-gray-800 border-x border-gray-300 text-gray-900 shadow-2xs font-bold'
                  : 'bg-gray-200 border-t-2 border-transparent text-gray-600 hover:bg-gray-300 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'Variable View (ভেরিয়েবল ভিউ)' : 'Variable View'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Variable Information Panel */}
        {showVariableSidebar && editMeta && (
          <aside className="w-80 bg-white text-gray-800 flex flex-col border-l border-gray-200 shadow-lg z-20">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-sm text-gray-900">Variable Information</h3>
              </div>
              <button
                onClick={() => setShowVariableSidebar(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={editMeta.name}
                    className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2 text-gray-900 font-mono text-xs"
                  />
                  <Check className="w-4 h-4 text-emerald-600 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  General
                </span>
                <label className="text-gray-700 block mb-1">Label</label>
                <input
                  type="text"
                  value={editMeta.label}
                  onChange={(e) => setEditMeta({ ...editMeta, label: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 block mb-1">Measure</label>
                  <select
                    value={editMeta.measure}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, measure: e.target.value as VariableMeasure })
                    }
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="scale">Scale</option>
                    <option value="ordinal">Ordinal</option>
                    <option value="nominal">Nominal</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 block mb-1">Role</label>
                  <select
                    value={editMeta.role}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, role: e.target.value as VariableRole })
                    }
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="input">Input</option>
                    <option value="target">Target</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-700 block mb-1">Variable Type</label>
                <select
                  value={editMeta.type}
                  onChange={(e) =>
                    setEditMeta({ ...editMeta, type: e.target.value as VariableType })
                  }
                  className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="numeric">Numeric</option>
                  <option value="dollar">Dollar ($)</option>
                  <option value="string">String</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 block mb-1">Width</label>
                  <input
                    type="number"
                    value={editMeta.width}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, width: parseInt(e.target.value) || 8 })
                    }
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="text-gray-700 block mb-1">Decimal Places</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editMeta.decimals}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, decimals: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-2 text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => setEditMeta({ ...selectedColumn })}
                className="px-3 py-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition font-medium text-xs border border-gray-300 bg-white"
              >
                Discard
              </button>
              <button
                onClick={handleApplyMeta}
                className="bg-gray-900 hover:bg-black text-white px-4 py-1.5 rounded transition font-medium text-xs shadow-xs"
              >
                Apply
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
