'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Download,
  RotateCcw,
  RotateCw,
  Plus,
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
  HelpCircle,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Printer,
  Binary,
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
  isFiltered?: boolean;
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
  isFiltered = false,
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

  const handleSelectAnalysis = (tabName: string) => {
    setActiveView('analysis');
    onSelectAnalysisTab(tabName);
    setOpenMenu(null);
  };

  return (
    <div ref={menuRef} className="bg-slate-900 text-slate-200 select-none border-b border-slate-800">
      {/* 1. CLASSIC SPSS DROP-DOWN MENU BAR */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-slate-950 border-b border-slate-800 text-xs font-normal relative">
        <div className="flex items-center space-x-0.5">
          {/* FILE MENU */}
        {/* FILE MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'file' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute left-0 top-full mt-0.5 w-52 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in-50 duration-100">
              <button
                onClick={() => {
                  setActiveView('upload');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex items-center justify-between"
              >
                <span>Open Data...</span>
                <span className="text-[10px] text-slate-400">Ctrl+O</span>
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button
                onClick={() => {
                  onUpdateDataset(CREDIT_PROMO_DATASET);
                  setActiveView('editor');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs"
              >
                Load creditpromo.sav
              </button>
              <button
                onClick={() => {
                  onUpdateDataset(IRIS_DATASET);
                  setActiveView('editor');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs"
              >
                Load iris.csv
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button
                onClick={exportCSV}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex items-center justify-between"
              >
                <span>Export to CSV</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'edit' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-0.5 w-44 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Undo</span>
                <span className="text-[10px] text-slate-400">Ctrl+Z</span>
              </button>
              <button
                onClick={() => setOpenMenu(null)}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Redo</span>
                <span className="text-[10px] text-slate-400">Ctrl+Y</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'view' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 top-full mt-0.5 w-48 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setActiveView('editor');
                  setEditorMode('data');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-medium"
              >
                Data View (Spreadsheet)
              </button>
              <button
                onClick={() => {
                  setActiveView('editor');
                  setEditorMode('variable');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-medium"
              >
                Variable View (Metadata)
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setShowLabels(!showLabels);
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Value Labels</span>
                <span className="text-blue-600 font-bold">{showLabels ? '✓' : ''}</span>
              </button>
            </div>
          )}
        </div>

        {/* DATA MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'data' ? null : 'data')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'data' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            Data
          </button>
          {openMenu === 'data' && (
            <div className="absolute left-0 top-full mt-0.5 w-56 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenSortModal();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center space-x-2 font-medium"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Sort Cases...</span>
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenSelectCasesModal();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center space-x-2 font-medium"
              >
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Select Cases (Filter)...</span>
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button
                onClick={() => {
                  setActiveView('editor');
                  setEditorMode('variable');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
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
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'transform' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            Transform
          </button>
          {openMenu === 'transform' && (
            <div className="absolute left-0 top-full mt-0.5 w-60 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenComputeModal();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-semibold text-blue-700 flex items-center space-x-2"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Compute Variable...</span>
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenRecodeModal();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-semibold text-purple-700 flex items-center space-x-2"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Recode into Different Variables...</span>
              </button>
            </div>
          )}
        </div>

        {/* ANALYZE MENU (THE CORE OF SPSS) */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'analyze' ? null : 'analyze')}
            className={`px-2.5 py-1 rounded transition font-semibold hover:bg-slate-800 ${
              openMenu === 'analyze' ? 'bg-blue-600 text-white' : 'text-blue-400'
            }`}
          >
            Analyze
          </button>
          {openMenu === 'analyze' && (
            <div className="absolute left-0 top-full mt-0.5 w-64 bg-white text-slate-800 rounded-md shadow-2xl border border-slate-200 py-1 z-50 text-xs">
              {/* Compare Means Submenu */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                Compare Means
              </div>
              <button
                onClick={() => handleSelectAnalysis('ttest')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                <span>Independent-Samples T-Test...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('paired_t')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Paired-Samples T-Test...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('one_sample_t')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>One-Sample T-Test...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('anova')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>One-Way ANOVA (F-Test)...</span>
              </button>

              {/* Regression Submenu */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">
                Regression & Modeling
              </div>
              <button
                onClick={() => handleSelectAnalysis('regression')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2 font-medium text-emerald-700"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Linear Regression (OLS)...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('logistic')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2 font-medium text-emerald-800"
              >
                <Binary className="w-3.5 h-3.5 text-emerald-600" />
                <span>Binary Logistic Regression...</span>
              </button>

              {/* Scale / Reliability Submenu */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">
                Scale & Psychometrics
              </div>
              <button
                onClick={() => handleSelectAnalysis('reliability')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2 font-medium text-amber-700"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Reliability Analysis (Cronbach’s α)...</span>
              </button>

              {/* Correlate */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">
                Correlate
              </div>
              <button
                onClick={() => handleSelectAnalysis('correlation')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Bivariate Correlation Matrix...</span>
              </button>

              {/* Nonparametric Tests */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">
                Nonparametric Tests
              </div>
              <button
                onClick={() => handleSelectAnalysis('mann_whitney')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <GitCompare className="w-3.5 h-3.5 text-purple-600" />
                <span>Mann-Whitney U Test...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('wilcoxon')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Wilcoxon Signed-Rank Test...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('kruskal_wallis')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>Kruskal-Wallis H Test...</span>
              </button>

              {/* Descriptive Statistics */}
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">
                Descriptive Statistics
              </div>
              <button
                onClick={() => handleSelectAnalysis('chisquare')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <Split className="w-3.5 h-3.5 text-blue-600" />
                <span>Crosstabs & Chi-Square...</span>
              </button>
              <button
                onClick={() => handleSelectAnalysis('descriptives')}
                className="w-full text-left px-4 py-1.5 hover:bg-blue-50 flex items-center space-x-2"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Exploration & Moments...</span>
              </button>
            </div>
          )}
        </div>

        {/* GRAPHS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'graphs' ? null : 'graphs')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'graphs' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            Graphs
          </button>
          {openMenu === 'graphs' && (
            <div className="absolute left-0 top-full mt-0.5 w-48 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <button
                onClick={() => handleSelectAnalysis('ttest')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
              >
                Histograms & Distribution Plots
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            className={`px-2.5 py-1 rounded transition hover:bg-slate-800 ${
              openMenu === 'help' ? 'bg-slate-800 text-white' : 'text-slate-300'
            }`}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="absolute left-0 top-full mt-0.5 w-52 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 py-1 z-50 text-xs">
              <div className="p-3 text-slate-600 space-y-1">
                <div className="font-bold text-slate-900">AutoStat Pro Statistics</div>
                <div className="text-[11px]">SPSS Modern Statistical Engine</div>
                <div className="text-[10px] text-slate-400">Rust Core • Next.js • APA 7th Edition</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side dataset indicator and language toggle */}
      <div className="flex items-center space-x-2.5 pr-1">
          <span className="text-[11px] font-mono text-slate-400">
            <span className="text-white font-semibold">{dataset.name}</span>
            <span className="text-slate-500 ml-1.5">[{dataset.rows.length} × {dataset.columns.length}]</span>
          </span>
          <button
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition"
          >
            <Globe className="w-3 h-3 text-blue-400" />
            <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* 3. CLASSIC SPSS ACTION ICON TOOLBAR */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/80 text-xs">
        <div className="flex items-center space-x-1">
          {/* File Open */}
          <button
            onClick={() => setActiveView('upload')}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Open Dataset File (Ctrl+O)"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </button>

          {/* Export / Save */}
          <button
            onClick={exportCSV}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Save / Export Dataset (Ctrl+S)"
          >
            <Save className="w-4 h-4 text-blue-400" />
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Print Output / Data (Ctrl+P)"
          >
            <Printer className="w-4 h-4 text-slate-300" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Sort Cases */}
          <button
            onClick={onOpenSortModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-medium transition text-[11px]"
            title="Sort Cases (Ascending / Descending)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Sort</span>
          </button>

          {/* Select Cases (Filter) */}
          <button
            onClick={onOpenSelectCasesModal}
            className={`flex items-center space-x-1 px-2 py-1 rounded border font-medium transition text-[11px] ${
              isFiltered
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-700/80 border-transparent hover:bg-slate-600 text-slate-200'
            }`}
            title="Select Cases (Conditional Filtering)"
          >
            <Filter className={`w-3.5 h-3.5 ${isFiltered ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{isFiltered ? 'Filter (Active)' : 'Select Cases'}</span>
          </button>

          {/* Recode into Different Variables */}
          <button
            onClick={onOpenRecodeModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-medium transition text-[11px]"
            title="Recode into Different Variables"
          >
            <Split className="w-3.5 h-3.5 text-purple-400" />
            <span>Recode</span>
          </button>

          {/* Compute Variable Button */}
          <button
            onClick={onOpenComputeModal}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition text-[11px]"
            title="Compute Variable (Formula Transformation)"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Compute</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Value Labels Switch */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center space-x-1 px-2 py-1 rounded border text-[11px] font-mono transition ${
              showLabels
                ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Value / Label View"
          >
            <span className="font-bold">1 ⇄ A</span>
            <span>{showLabels ? 'Labels ON' : 'Values'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Quick Analysis Dropdown Trigger */}
          <button
            onClick={() => {
              setActiveView('analysis');
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition text-xs shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Run Analysis</span>
          </button>
        </div>

        {/* View Switchers: Data View vs Variable View vs Output */}
        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[11px]">
          <button
            onClick={() => {
              setActiveView('editor');
              setEditorMode('data');
            }}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeView === 'editor' && editorMode === 'data'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
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
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Variable View
          </button>
          <button
            onClick={() => setActiveView('analysis')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              activeView === 'analysis'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Analysis Output
          </button>
        </div>
      </div>
    </div>
  );
};
