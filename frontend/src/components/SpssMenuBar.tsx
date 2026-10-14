'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  SlidersHorizontal,
  Table,
  Calculator,
  GitCompare,
  TrendingUp,
  BarChart3,
  Split,
  Target,
  ArrowRightLeft,
  Grid3X3,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  ArrowUpDown,
  Filter,
  Printer,
  Binary,
  Scale,
  Layers,
} from 'lucide-react';
import { Dataset } from '../types/dataset';
import { CREDIT_PROMO_DATASET, IRIS_DATASET } from '../data/sampleDatasets';

interface SpssMenuBarProps {
  dataset: Dataset;
  onUpdateDataset: (ds: Dataset) => void;
  activeView: 'upload' | 'editor' | 'analysis';
  setActiveView: (view: 'upload' | 'editor' | 'analysis') => void;
  editorMode: 'data' | 'variable';
  setEditorMode: (mode: 'data' | 'variable') => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  onOpenComputeModal: () => void;
  onOpenSortModal: () => void;
  onOpenSelectCasesModal: () => void;
  onOpenRecodeModal: () => void;
  onOpenChartBuilderModal: () => void;
  onOpenSplitFileModal: () => void;
  onOpenWeightCasesModal: () => void;
  isFiltered?: boolean;
  splitVar?: string | null;
  weightVar?: string | null;
  onSelectAnalysisTab: (tab: string) => void;
  lang: 'en' | 'bn';
  setLang: (lang: 'en' | 'bn') => void;
}

export const SpssMenuBar: React.FC<SpssMenuBarProps> = ({
  dataset,
  onUpdateDataset,
  activeView,
  setActiveView,
  editorMode,
  setEditorMode,
  showLabels,
  setShowLabels,
  onOpenComputeModal,
  onOpenSortModal,
  onOpenSelectCasesModal,
  onOpenRecodeModal,
  onOpenChartBuilderModal,
  onOpenSplitFileModal,
  onOpenWeightCasesModal,
  isFiltered = false,
  splitVar = null,
  weightVar = null,
  onSelectAnalysisTab,
  lang,
  setLang,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportCSV = () => {
    const headers = dataset.columns.map((c) => c.name).join(',');
    const rows = dataset.rows
      .map((r) => dataset.columns.map((c) => JSON.stringify(r[c.name] ?? '')).join(','))
      .join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\.[^/.]+$/, '')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const exportSAV = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/datasets/export-sav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset),
      });
      if (!res.ok) throw new Error('Backend export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dataset.name.endsWith('.sav') ? dataset.name : `${dataset.name}.sav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      exportCSV();
    }
    setOpenMenu(null);
  };

  const handleSelectAnalysis = (tabName: string) => {
    setActiveView('analysis');
    onSelectAnalysisTab(tabName);
    setOpenMenu(null);
  };

  return (
    <div ref={menuRef} className="bg-gray-100 text-gray-800 select-none border-b border-gray-300">
      {/* 1. AUTOSTAT DROP-DOWN MENU BAR */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-gray-100 border-b border-gray-300 text-xs font-normal relative">
        <div className="flex items-center space-x-0.5">
          {/* FILE MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'file' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              File
            </button>
            {openMenu === 'file' && (
              <div className="absolute left-0 top-full mt-0.5 w-52 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setActiveView('upload');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <span>Open Data...</span>
                  <span className="text-[10px] text-gray-400">Ctrl+O</span>
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    onUpdateDataset(CREDIT_PROMO_DATASET);
                    setActiveView('editor');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Load creditpromo.sav
                </button>
                <button
                  onClick={() => {
                    onUpdateDataset(IRIS_DATASET);
                    setActiveView('editor');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Load iris.csv
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={exportSAV}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between font-medium text-gray-900"
                >
                  <span>Export as SAV (.sav)...</span>
                  <span className="text-[10px] text-gray-400">Ctrl+S</span>
                </button>
                <button
                  onClick={exportCSV}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <span>Export to CSV (.csv)...</span>
                  <Download className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* EDIT MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'edit' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              Edit
            </button>
            {openMenu === 'edit' && (
              <div className="absolute left-0 top-full mt-0.5 w-44 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => setOpenMenu(null)}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <span>Undo</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => setOpenMenu(null)}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <span>Redo</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Y</span>
                </button>
              </div>
            )}
          </div>

          {/* VIEW MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'view' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              View
            </button>
            {openMenu === 'view' && (
              <div className="absolute left-0 top-full mt-0.5 w-48 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setActiveView('editor');
                    setEditorMode('data');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-medium text-gray-700 hover:text-gray-900"
                >
                  Data View (Spreadsheet)
                </button>
                <button
                  onClick={() => {
                    setActiveView('editor');
                    setEditorMode('variable');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-medium text-gray-700 hover:text-gray-900"
                >
                  Variable View (Metadata)
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowLabels(!showLabels);
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <span>Value Labels</span>
                  <span className="text-gray-900 font-bold">{showLabels ? '✓' : ''}</span>
                </button>
              </div>
            )}
          </div>

          {/* DATA MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'data' ? null : 'data')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'data' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              Data
            </button>
            {openMenu === 'data' && (
              <div className="absolute left-0 top-full mt-0.5 w-56 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenSortModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                  <span>Sort Cases...</span>
                </button>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenSelectCasesModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  <span>Select Cases (Filter)...</span>
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenSplitFileModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <div className="flex items-center space-x-2">
                    <Split className="w-3.5 h-3.5 text-gray-500" />
                    <span>Split File...</span>
                  </div>
                  {splitVar && <span className="text-[10px] text-gray-700 font-mono font-semibold">[{splitVar}]</span>}
                </button>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenWeightCasesModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-900"
                >
                  <div className="flex items-center space-x-2">
                    <Scale className="w-3.5 h-3.5 text-gray-500" />
                    <span>Weight Cases...</span>
                  </div>
                  {weightVar && <span className="text-[10px] text-gray-700 font-mono font-semibold">[{weightVar}]</span>}
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    setActiveView('editor');
                    setEditorMode('variable');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Define Variable Properties...
                </button>
              </div>
            )}
          </div>

          {/* TRANSFORM MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'transform' ? null : 'transform')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'transform' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              Transform
            </button>
            {openMenu === 'transform' && (
              <div className="absolute left-0 top-full mt-0.5 w-60 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenComputeModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 hover:text-gray-900 flex items-center space-x-2"
                >
                  <Calculator className="w-3.5 h-3.5 text-gray-500" />
                  <span>Compute Variable...</span>
                </button>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenRecodeModal();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 hover:text-gray-900 flex items-center space-x-2"
                >
                  <Split className="w-3.5 h-3.5 text-gray-500" />
                  <span>Recode into Different Variables...</span>
                </button>
              </div>
            )}
          </div>

          {/* ANALYZE MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'analyze' ? null : 'analyze')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'analyze' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700 font-medium'
              }`}
            >
              Analyze
            </button>
            {openMenu === 'analyze' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 bg-white text-gray-800 rounded shadow-xl border border-gray-200 py-1 z-50 text-xs">
                {/* Compare Means Submenu */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100">
                  Compare Means
                </div>
                <button
                  onClick={() => handleSelectAnalysis('ttest')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <GitCompare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Independent-Samples T-Test...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('paired_t')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" />
                  <span>Paired-Samples T-Test...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('one_sample_t')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Target className="w-3.5 h-3.5 text-gray-500" />
                  <span>One-Sample T-Test...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('anova')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  <span>One-Way ANOVA (F-Test)...</span>
                </button>

                {/* Regression Submenu */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Regression & Modeling
                </div>
                <button
                  onClick={() => handleSelectAnalysis('regression')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  <span>Linear Regression (OLS)...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('logistic')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Binary className="w-3.5 h-3.5 text-gray-500" />
                  <span>Binary Logistic Regression...</span>
                </button>

                {/* Dimension Reduction */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Dimension Reduction
                </div>
                <button
                  onClick={() => handleSelectAnalysis('factor')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span>Factor Analysis / PCA (Rust Core)...</span>
                </button>

                {/* Scale / Reliability Submenu */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Scale & Psychometrics
                </div>
                <button
                  onClick={() => handleSelectAnalysis('reliability')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                  <span>Reliability Analysis (Cronbach’s α)...</span>
                </button>

                {/* Correlate */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Correlate
                </div>
                <button
                  onClick={() => handleSelectAnalysis('correlation')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Bivariate Correlation Matrix...</span>
                </button>

                {/* Nonparametric Tests */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Nonparametric Tests
                </div>
                <button
                  onClick={() => handleSelectAnalysis('mann_whitney')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <GitCompare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Mann-Whitney U Test...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('wilcoxon')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" />
                  <span>Wilcoxon Signed-Rank Test...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('kruskal_wallis')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  <span>Kruskal-Wallis H Test...</span>
                </button>

                {/* Descriptive Statistics */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-y border-gray-100 mt-1">
                  Descriptive Statistics
                </div>
                <button
                  onClick={() => handleSelectAnalysis('chisquare')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Split className="w-3.5 h-3.5 text-gray-500" />
                  <span>Crosstabs & Chi-Square...</span>
                </button>
                <button
                  onClick={() => handleSelectAnalysis('descriptives')}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Exploration & Moments...</span>
                </button>
              </div>
            )}
          </div>

          {/* GRAPHS MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'graphs' ? null : 'graphs')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'graphs' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              Graphs
            </button>
            {openMenu === 'graphs' && (
              <div className="absolute left-0 top-full mt-0.5 w-56 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    onOpenChartBuilderModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Chart Builder...</span>
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={() => {
                    onOpenChartBuilderModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <span>Histogram with Normal Curve</span>
                </button>
                <button
                  onClick={() => {
                    onOpenChartBuilderModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <span>Scatterplot & Fit Line</span>
                </button>
                <button
                  onClick={() => {
                    onOpenChartBuilderModal();
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-100 flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <span>Boxplot & Outlier Detection</span>
                </button>
              </div>
            )}
          </div>

          {/* HELP MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
              className={`px-2.5 py-1 rounded transition hover:bg-gray-200 ${
                openMenu === 'help' ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
              }`}
            >
              Help
            </button>
            {openMenu === 'help' && (
              <div className="absolute left-0 top-full mt-0.5 w-56 bg-white text-gray-800 rounded shadow-lg border border-gray-200 py-1 z-50 text-xs">
                <div className="p-3 text-gray-600 space-y-1">
                  <div className="font-bold text-gray-900 text-sm">AutoStat Pro Statistics</div>
                  <div className="text-[11px] text-gray-700">AutoStat Modern Statistical Engine</div>
                  <div className="text-[10px] text-gray-500">Rust Core • Python FastAPI • APA 7th Edition</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side dataset indicator and language toggle */}
        <div className="flex items-center space-x-2.5 pr-1">
          <span className="text-[11px] font-mono text-gray-600">
            <span className="text-gray-900 font-semibold">{dataset.name}</span>
            <span className="text-gray-500 ml-1.5">[{dataset.rows.length} × {dataset.columns.length}]</span>
          </span>
          <button
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center space-x-1 bg-white hover:bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-[11px] border border-gray-300 transition"
          >
            <Globe className="w-3 h-3 text-gray-500" />
            <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* 2. AUTOSTAT ACTION ICON TOOLBAR */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-gray-200 text-xs">
        <div className="flex items-center space-x-1">
          {/* File Open */}
          <button
            onClick={() => setActiveView('upload')}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
            title="Open Dataset File (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4 text-gray-600" />
          </button>

          {/* Export / Save */}
          <button
            onClick={exportSAV}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
            title="Save / Export Dataset (.sav / .csv) (Ctrl+S)"
          >
            <Save className="w-4 h-4 text-gray-600" />
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
            title="Print Output / Data (Ctrl+P)"
          >
            <Printer className="w-4 h-4 text-gray-600" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1"></div>

          {/* Sort Cases */}
          <button
            onClick={onOpenSortModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium transition text-[11px]"
            title="Sort Cases (Ascending / Descending)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
            <span>Sort</span>
          </button>

          {/* Select Cases (Filter) */}
          <button
            onClick={onOpenSelectCasesModal}
            className={`flex items-center space-x-1 px-2 py-1 rounded border font-medium transition text-[11px] ${
              isFiltered
                ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold'
                : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
            title="Select Cases (Conditional Filtering)"
          >
            <Filter className={`w-3.5 h-3.5 ${isFiltered ? 'text-gray-900' : 'text-gray-500'}`} />
            <span>{isFiltered ? 'Filter (Active)' : 'Select Cases'}</span>
          </button>

          {/* Split File */}
          <button
            onClick={onOpenSplitFileModal}
            className={`flex items-center space-x-1 px-2 py-1 rounded border font-medium transition text-[11px] ${
              splitVar
                ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold'
                : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
            title="Split File (Group Subsetting & Parallel Analysis)"
          >
            <Split className={`w-3.5 h-3.5 ${splitVar ? 'text-gray-900' : 'text-gray-500'}`} />
            <span>{splitVar ? `Split: ${splitVar}` : 'Split File'}</span>
          </button>

          {/* Weight Cases */}
          <button
            onClick={onOpenWeightCasesModal}
            className={`flex items-center space-x-1 px-2 py-1 rounded border font-medium transition text-[11px] ${
              weightVar
                ? 'bg-gray-200 border-gray-400 text-gray-900 font-semibold'
                : 'bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
            title="Weight Cases (Frequency Weighting)"
          >
            <Scale className={`w-3.5 h-3.5 ${weightVar ? 'text-gray-900' : 'text-gray-500'}`} />
            <span>{weightVar ? `Weight: ${weightVar}` : 'Weight'}</span>
          </button>

          {/* Recode into Different Variables */}
          <button
            onClick={onOpenRecodeModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium transition text-[11px]"
            title="Recode into Different Variables"
          >
            <Split className="w-3.5 h-3.5 text-gray-500" />
            <span>Recode</span>
          </button>

          {/* Compute Variable Button */}
          <button
            onClick={onOpenComputeModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium transition text-[11px]"
            title="Compute Variable (Formula Transformation)"
          >
            <Calculator className="w-3.5 h-3.5 text-gray-500" />
            <span>Compute</span>
          </button>

          {/* Chart Builder Button */}
          <button
            onClick={onOpenChartBuilderModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium transition text-[11px]"
            title="AutoStat Chart Builder (Histograms, Boxplots, Scatterplots)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
            <span>Charts</span>
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1"></div>

          {/* Value Labels Switch */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center space-x-1 px-2 py-1 rounded border text-[11px] font-mono transition ${
              showLabels
                ? 'bg-gray-200 border-gray-400 text-gray-900 font-bold'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle Value / Label View"
          >
            <span className="font-bold">1 ⇄ A</span>
            <span>{showLabels ? 'Labels ON' : 'Values'}</span>
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1"></div>

          {/* Quick Analysis Dropdown Trigger */}
          <button
            onClick={() => {
              setActiveView('analysis');
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gray-900 hover:bg-black text-white font-medium transition text-xs shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Run Analysis</span>
          </button>
        </div>

        {/* View Switchers: Data View vs Variable View vs Output */}
        <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded border border-gray-300 text-[11px]">
          <button
            onClick={() => {
              setActiveView('editor');
              setEditorMode('data');
            }}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeView === 'editor' && editorMode === 'data'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Data View
          </button>
          <button
            onClick={() => {
              setActiveView('editor');
              setEditorMode('variable');
            }}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeView === 'editor' && editorMode === 'variable'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Variable View
          </button>
          <button
            onClick={() => setActiveView('analysis')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeView === 'analysis'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analysis Output
          </button>
        </div>
      </div>
    </div>
  );
};
