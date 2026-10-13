'use client';

import React, { useState } from 'react';
import {
  Download,
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
}

export const DataEditorView: React.FC<DataEditorViewProps> = ({
  dataset,
  onUpdateDataset,
  onNavigateToAnalysis,
  lang,
}) => {
  const [editorMode, setEditorMode] = useState<'data' | 'variable'>('data');
  const [selectedColumnName, setSelectedColumnName] = useState<string>(
    dataset.columns[0]?.name || ''
  );
  const [showVariableSidebar, setShowVariableSidebar] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

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

  const formatCellValue = (val: any, col: ColumnMetadata) => {
    if (val === null || val === undefined || val === '') return '';
    if (col.type === 'dollar' && typeof val === 'number') {
      return `$${val.toLocaleString('en-US', {
        minimumFractionDigits: col.decimals,
        maximumFractionDigits: col.decimals,
      })}`;
    }
    if (col.type === 'numeric' && typeof val === 'number') {
      return val.toFixed(col.decimals);
    }
    if (showLabels && col.valueLabels && col.valueLabels[val]) {
      return col.valueLabels[val];
    }
    return String(val);
  };

  const exportCSV = () => {
    const headers = dataset.columns.map((c) => c.name).join(',');
    const rows = dataset.rows
      .map((r) => dataset.columns.map((c) => JSON.stringify(r[c.name] ?? '')).join(','))
      .join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\.[^/.]+$/, '')}_exported.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMeasureIcon = (measure: VariableMeasure) => {
    switch (measure) {
      case 'scale':
        return (
          <span title="Scale (Continuous)">
            <Ruler className="w-3.5 h-3.5 text-blue-500" />
          </span>
        );
      case 'ordinal':
        return (
          <span title="Ordinal (Ranked)">
            <BarChart2 className="w-3.5 h-3.5 text-amber-500" />
          </span>
        );
      case 'nominal':
        return (
          <span title="Nominal (Categorical)">
            <PieChart className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] bg-slate-100 overflow-hidden select-none">
      {/* Sub-toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center space-x-2">
          {/* SPSS Data View vs Variable View Toggle Switch */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setEditorMode('data')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                editorMode === 'data'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'Data View (ডেটা)' : 'Data View'}</span>
            </button>
            <button
              onClick={() => setEditorMode('variable')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                editorMode === 'variable'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'Variable View (ভেরিয়েবল)' : 'Variable View'}</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'bn' ? 'এক্সপোর্ট CSV' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleAddNewVariable}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-slate-100 text-slate-700 font-medium transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'bn' ? '+ ভেরিয়েবল যোগ' : '+ Add Variable'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => onNavigateToAnalysis()}
            className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-full border border-blue-200 transition"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'bn' ? '+ নতুন অ্যানালাইসিস' : '+ New Analysis'}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          {/* Value / Label Switch */}
          {editorMode === 'data' && (
            <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 font-medium">
              <span>Value</span>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`w-8 h-4 rounded-full transition relative ${
                  showLabels ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition absolute top-0.25 ${
                    showLabels ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
              <span className={showLabels ? 'text-purple-700 font-semibold' : ''}>Label</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowVariableSidebar(!showVariableSidebar)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border transition font-medium ${
              showVariableSidebar
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ভেরিয়েবল প্যানেল' : 'Variable Info Panel'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIEW 1: DATA VIEW (SPREADSHEET OF CASES) */}
        {editorMode === 'data' && (
          <div className="flex-1 overflow-auto bg-white border-r border-slate-200">
            <table className="w-full border-collapse text-xs text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-300 shadow-xs z-10">
                <tr>
                  <th className="w-12 px-2 py-2 border-r border-slate-200 text-center font-semibold text-slate-400 bg-slate-100">
                    #
                  </th>
                  {dataset.columns.map((col) => {
                    const isSelected = selectedColumnName === col.name;
                    return (
                      <th
                        key={col.name}
                        onClick={() => handleSelectColumn(col.name)}
                        className={`px-3 py-2 border-r border-slate-200 font-semibold cursor-pointer transition min-w-[140px] ${
                          isSelected
                            ? 'bg-blue-100/70 text-blue-900 border-b-2 border-b-blue-600'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{col.label || col.name}</span>
                          <div className="ml-1.5">{getMeasureIcon(col.measure)}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal uppercase">
                          {col.type} • {col.measure}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dataset.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-blue-50/30 border-b border-slate-100 group">
                    <td className="px-2 py-1.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-400 bg-slate-50 group-hover:bg-slate-100">
                      {rIdx + 1}
                    </td>
                    {dataset.columns.map((col) => {
                      const isSelectedCol = selectedColumnName === col.name;
                      const cellVal = row[col.name];
                      return (
                        <td
                          key={col.name}
                          className={`px-3 py-1.5 border-r border-slate-100 font-mono text-slate-800 ${
                            isSelectedCol ? 'bg-blue-50/20' : ''
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
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 text-xs"
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

        {/* VIEW 2: VARIABLE VIEW (SPSS VARIABLE METADATA TABLE) */}
        {editorMode === 'variable' && (
          <div className="flex-1 overflow-auto bg-white border-r border-slate-200">
            <table className="w-full border-collapse text-xs text-left">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-300 shadow-xs z-10 text-slate-700 font-semibold">
                <tr>
                  <th className="w-10 px-2 py-2 border-r border-slate-200 text-center bg-slate-100">
                    #
                  </th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[120px]">Name</th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[100px]">Type</th>
                  <th className="px-3 py-2 border-r border-slate-200 w-20">Width</th>
                  <th className="px-3 py-2 border-r border-slate-200 w-20">Decimals</th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[200px]">Label</th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[100px]">Align</th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[120px]">Measure</th>
                  <th className="px-3 py-2 border-r border-slate-200 min-w-[110px]">Role</th>
                  <th className="px-3 py-2 border-r border-slate-200 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {dataset.columns.map((col, idx) => {
                  const isSelected = selectedColumnName === col.name;
                  return (
                    <tr
                      key={col.name}
                      onClick={() => handleSelectColumn(col.name)}
                      className={`hover:bg-blue-50/40 border-b border-slate-100 cursor-pointer ${
                        isSelected ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-2 py-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-400 bg-slate-50">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-1.5 border-r border-slate-100 font-mono font-semibold text-slate-900">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) =>
                            handleUpdateVariableField(col.name, 'name', e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-xs"
                        />
                      </td>

                      {/* Type Dropdown */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
                        <select
                          value={col.type}
                          onChange={(e) =>
                            handleUpdateVariableField(
                              col.name,
                              'type',
                              e.target.value as VariableType
                            )
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                        >
                          <option value="numeric">Numeric</option>
                          <option value="dollar">Dollar ($)</option>
                          <option value="string">String</option>
                          <option value="date">Date</option>
                        </select>
                      </td>

                      {/* Width */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
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
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                        />
                      </td>

                      {/* Decimals */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
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
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                        />
                      </td>

                      {/* Label */}
                      <td className="px-3 py-1.5 border-r border-slate-100 text-slate-800">
                        <input
                          type="text"
                          value={col.label}
                          onChange={(e) =>
                            handleUpdateVariableField(col.name, 'label', e.target.value)
                          }
                          className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-xs"
                        />
                      </td>

                      {/* Align */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
                        <select
                          value={col.align || 'right'}
                          onChange={(e) =>
                            handleUpdateVariableField(
                              col.name,
                              'align',
                              e.target.value as VariableAlign
                            )
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                        >
                          <option value="right">Right</option>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                        </select>
                      </td>

                      {/* Measure */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
                        <select
                          value={col.measure}
                          onChange={(e) =>
                            handleUpdateVariableField(
                              col.name,
                              'measure',
                              e.target.value as VariableMeasure
                            )
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800 font-medium"
                        >
                          <option value="scale">Scale (Metric)</option>
                          <option value="ordinal">Ordinal (Rank)</option>
                          <option value="nominal">Nominal (Cat)</option>
                        </select>
                      </td>

                      {/* Role */}
                      <td className="px-3 py-1.5 border-r border-slate-100">
                        <select
                          value={col.role}
                          onChange={(e) =>
                            handleUpdateVariableField(
                              col.name,
                              'role',
                              e.target.value as VariableRole
                            )
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                        >
                          <option value="input">Input</option>
                          <option value="target">Target</option>
                          <option value="both">Both</option>
                          <option value="none">None</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVariable(col.name);
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition"
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

        {/* Collapsible Variable Information Panel */}
        {showVariableSidebar && editMeta && (
          <aside className="w-80 bg-slate-900 text-slate-100 flex flex-col border-l border-slate-800 shadow-xl z-20">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">Variable Information</h3>
              </div>
              <button
                onClick={() => setShowVariableSidebar(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={editMeta.name}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  />
                  <Check className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  General
                </span>
                <label className="text-slate-300 block mb-1">Label</label>
                <input
                  type="text"
                  value={editMeta.label}
                  onChange={(e) => setEditMeta({ ...editMeta, label: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Measure</label>
                  <select
                    value={editMeta.measure}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, measure: e.target.value as VariableMeasure })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="scale">Scale</option>
                    <option value="ordinal">Ordinal</option>
                    <option value="nominal">Nominal</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Role</label>
                  <select
                    value={editMeta.role}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, role: e.target.value as VariableRole })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="input">Input</option>
                    <option value="target">Target</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Variable Type</label>
                <select
                  value={editMeta.type}
                  onChange={(e) =>
                    setEditMeta({ ...editMeta, type: e.target.value as VariableType })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="numeric">Numeric</option>
                  <option value="dollar">Dollar ($)</option>
                  <option value="string">String</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Width</label>
                  <input
                    type="number"
                    value={editMeta.width}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, width: parseInt(e.target.value) || 8 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Decimal Places</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editMeta.decimals}
                    onChange={(e) =>
                      setEditMeta({ ...editMeta, decimals: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end space-x-2 bg-slate-950">
              <button
                onClick={() => setEditMeta({ ...selectedColumn })}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition font-medium text-xs"
              >
                Discard
              </button>
              <button
                onClick={handleApplyMeta}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition font-medium text-xs shadow-md shadow-blue-500/20"
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
