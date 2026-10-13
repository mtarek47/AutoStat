'use client';

import React, { useState } from 'react';
import { SpssMenuBar } from '../components/SpssMenuBar';
import { UploadView } from '../components/UploadView';
import { DataEditorView } from '../components/DataEditorView';
import { AnalysisView } from '../components/AnalysisView';
import { StatusBar } from '../components/StatusBar';
import { ComputeVariableModal } from '../components/ComputeVariableModal';
import { SortCasesModal } from '../components/SortCasesModal';
import { SelectCasesModal } from '../components/SelectCasesModal';
import { RecodeVariableModal } from '../components/RecodeVariableModal';
import { CREDIT_PROMO_DATASET } from '../data/sampleDatasets';
import { Dataset } from '../types/dataset';

export default function Home() {
  const [activeView, setActiveView] = useState<'upload' | 'editor' | 'analysis'>('editor');
  const [editorMode, setEditorMode] = useState<'data' | 'variable'>('data');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [dataset, setDataset] = useState<Dataset>(CREDIT_PROMO_DATASET);
  const [originalDataset, setOriginalDataset] = useState<Dataset>(CREDIT_PROMO_DATASET);
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  // Dialog modals states
  const [isComputeModalOpen, setIsComputeModalOpen] = useState<boolean>(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState<boolean>(false);
  const [isSelectCasesModalOpen, setIsSelectCasesModalOpen] = useState<boolean>(false);
  const [isRecodeModalOpen, setIsRecodeModalOpen] = useState<boolean>(false);

  const [selectedAnalysisTab, setSelectedAnalysisTab] = useState<string>('ttest');

  const isFiltered = dataset.rows.length < originalDataset.rows.length;

  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    setOriginalDataset(newDataset);
    setActiveView('editor');
  };

  const handleSelectAnalysisFromMenu = (tabName: string) => {
    setSelectedAnalysisTab(tabName);
    setActiveView('analysis');
  };

  const handleUpdateDataset = (updated: Dataset) => {
    setDataset(updated);
    // If not actively filtered, keep original synced
    if (!isFiltered) {
      setOriginalDataset(updated);
    }
  };

  const handleRestoreOriginal = () => {
    setDataset(originalDataset);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* Authentic IBM SPSS Top Menu Bar & Action Ribbon */}
      <SpssMenuBar
        dataset={dataset}
        onUpdateDataset={handleUpdateDataset}
        activeView={activeView}
        setActiveView={setActiveView}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        onOpenComputeModal={() => setIsComputeModalOpen(true)}
        onOpenSortModal={() => setIsSortModalOpen(true)}
        onOpenSelectCasesModal={() => setIsSelectCasesModalOpen(true)}
        onOpenRecodeModal={() => setIsRecodeModalOpen(true)}
        isFiltered={isFiltered}
        onSelectAnalysisTab={handleSelectAnalysisFromMenu}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Dynamic View */}
      <main className="flex-1 overflow-hidden relative">
        {activeView === 'upload' && (
          <div className="h-full overflow-y-auto">
            <UploadView onDatasetLoaded={handleDatasetLoaded} lang={lang} />
          </div>
        )}

        {activeView === 'editor' && (
          <DataEditorView
            dataset={dataset}
            onUpdateDataset={handleUpdateDataset}
            onNavigateToAnalysis={() => setActiveView('analysis')}
            lang={lang}
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
          />
        )}

        {activeView === 'analysis' && (
          <AnalysisView
            dataset={dataset}
            initialTab={selectedAnalysisTab}
            lang={lang}
          />
        )}
      </main>

      {/* Bottom Status Bar (IBM SPSS Statistics Processor Ready) */}
      <StatusBar
        rowCount={dataset.rows.length}
        colCount={dataset.columns.length}
        activeDatasetName={dataset.name}
        lang={lang}
      />

      {/* SPSS Compute Variable Modal */}
      <ComputeVariableModal
        isOpen={isComputeModalOpen}
        onClose={() => setIsComputeModalOpen(false)}
        dataset={dataset}
        onUpdateDataset={handleUpdateDataset}
        lang={lang}
      />

      {/* SPSS Sort Cases Modal */}
      <SortCasesModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        dataset={dataset}
        onUpdateDataset={handleUpdateDataset}
        lang={lang}
      />

      {/* SPSS Select Cases (Filter) Modal */}
      <SelectCasesModal
        isOpen={isSelectCasesModalOpen}
        onClose={() => setIsSelectCasesModalOpen(false)}
        dataset={dataset}
        originalDataset={originalDataset}
        onUpdateDataset={setDataset}
        onRestoreOriginal={handleRestoreOriginal}
        isFiltered={isFiltered}
        lang={lang}
      />

      {/* SPSS Recode into Different Variables Modal */}
      <RecodeVariableModal
        isOpen={isRecodeModalOpen}
        onClose={() => setIsRecodeModalOpen(false)}
        dataset={dataset}
        onUpdateDataset={handleUpdateDataset}
        lang={lang}
      />
    </div>
  );
}
