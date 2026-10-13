'use client';

import React, { useState } from 'react';
import { Header } from '../components/Header';
import { UploadView } from '../components/UploadView';
import { DataEditorView } from '../components/DataEditorView';
import { AnalysisView } from '../components/AnalysisView';
import { StatusBar } from '../components/StatusBar';
import { CREDIT_PROMO_DATASET } from '../data/sampleDatasets';
import { Dataset } from '../types/dataset';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'editor' | 'analysis'>('editor');
  const [dataset, setDataset] = useState<Dataset>(CREDIT_PROMO_DATASET);
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    setActiveTab('editor');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      {/* Top Header & Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasetName={dataset.name}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Dynamic View */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'upload' && (
          <div className="h-full overflow-y-auto">
            <UploadView onDatasetLoaded={handleDatasetLoaded} lang={lang} />
          </div>
        )}

        {activeTab === 'editor' && (
          <DataEditorView
            dataset={dataset}
            onUpdateDataset={setDataset}
            onNavigateToAnalysis={() => setActiveTab('analysis')}
            lang={lang}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisView dataset={dataset} lang={lang} />
        )}
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        rowCount={dataset.rows.length}
        colCount={dataset.columns.length}
        activeDatasetName={dataset.name}
        lang={lang}
      />
    </div>
  );
}
