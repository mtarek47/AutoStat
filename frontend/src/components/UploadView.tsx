'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Cpu,
  Sparkles,
  Filter,
  CheckCircle,
  Database,
  ArrowRight,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, ColumnMetadata, VariableMeasure, VariableType } from '../types/dataset';
import { CREDIT_PROMO_DATASET, IRIS_DATASET } from '../data/sampleDatasets';

interface UploadViewProps {
  onDatasetLoaded: (dataset: Dataset) => void;
  lang: 'en' | 'bn';
}

export const UploadView: React.FC<UploadViewProps> = ({ onDatasetLoaded, lang }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            buildDatasetFromRaw(file.name, results.data as Record<string, any>[]);
          } else {
            setErrorMsg(lang === 'bn' ? 'ফাইলটিতে কোনো ডেটা পাওয়া যায়নি।' : 'No data records found in CSV file.');
            setIsProcessing(false);
          }
        },
        error: (err) => {
          setErrorMsg(err.message);
          setIsProcessing(false);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

          if (jsonData.length > 0) {
            buildDatasetFromRaw(file.name, jsonData);
          } else {
            setErrorMsg(lang === 'bn' ? 'এক্সেল ফাইলে কোনো ডেটা পাওয়া যায়নি।' : 'No data records found in Excel worksheet.');
            setIsProcessing(false);
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Error parsing Excel spreadsheet');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrorMsg(
        lang === 'bn'
          ? 'শুধুমাত্র .csv, .xlsx অথবা .xls ফরম্যাট সমর্থিত।'
          : 'Unsupported format. Please upload .csv, .xlsx, or .xls file.'
      );
      setIsProcessing(false);
    }
  };

  const buildDatasetFromRaw = (fileName: string, rawRows: Record<string, any>[]) => {
    const rawKeys = Object.keys(rawRows[0] || {});
    const columns: ColumnMetadata[] = rawKeys.map((key) => {
      // Auto-detect variable type and measure
      let numericCount = 0;
      let nonNullCount = 0;
      const uniqueValues = new Set<any>();

      rawRows.forEach((row) => {
        const val = row[key];
        if (val !== null && val !== undefined && val !== '') {
          nonNullCount++;
          uniqueValues.add(val);
          if (typeof val === 'number' || !isNaN(Number(val))) {
            numericCount++;
          }
        }
      });

      const isNumeric = nonNullCount > 0 && numericCount / nonNullCount > 0.8;
      const isUniqueRatioSmall = uniqueValues.size <= Math.min(10, rawRows.length * 0.2);

      let measure: VariableMeasure = 'nominal';
      let type: VariableType = 'string';

      if (isNumeric) {
        type = 'numeric';
        measure = isUniqueRatioSmall ? 'ordinal' : 'scale';
      } else {
        type = 'string';
        measure = 'nominal';
      }

      return {
        name: key,
        label: key.replace(/_/g, ' '),
        type,
        measure,
        role: 'input',
        decimals: isNumeric ? 2 : 0,
        width: 10,
      };
    });

    const newDataset: Dataset = {
      id: `ds-${Date.now()}`,
      name: fileName,
      columns,
      rows: rawRows,
      createdAt: new Date().toISOString(),
    };

    setIsProcessing(false);
    onDatasetLoaded(newDataset);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Title & Subtitle */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          {lang === 'bn' ? 'আপনার গবেষণা ডেটাসেট আপলোড করুন' : 'Upload Your Research Dataset'}
        </h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          {lang === 'bn'
            ? 'আপনার গবেষণার Excel (.xlsx, .xls) অথবা CSV ফাইল আপলোড করে তাৎক্ষণিক স্বয়ংক্রিয় পরিসংখ্যান শুরু করুন।'
            : 'Start by uploading your Excel or CSV file containing the research data to begin automated analysis.'}
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-white shadow-sm ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <div>
            <p className="text-base font-medium text-slate-800">
              {lang === 'bn' ? 'ফাইলটি এখানে টেনে আনুন, অথবা ব্রাউজ করুন' : 'Drag and drop your file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'bn' ? 'সমর্থিত ফরম্যাট: .xlsx, .xls, .csv' : 'Supported formats: .xlsx, .xls, .csv'}
            </p>
          </div>

          <button
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>
              {isProcessing
                ? (lang === 'bn' ? 'প্রসেসিং হচ্ছে...' : 'Processing...')
                : (lang === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Select File')}
            </span>
          </button>

          {errorMsg && (
            <div className="mt-3 text-red-600 text-xs bg-red-50 px-4 py-2 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Preset / Sample Datasets Quick Load Bar */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-medium">
          <Database className="w-4 h-4 text-blue-600" />
          <span>{lang === 'bn' ? 'দ্রুত টেস্ট করতে স্যাম্পল ডেটাসেট ব্যবহার করুন:' : 'Or test immediately with built-in research datasets:'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDatasetLoaded(CREDIT_PROMO_DATASET)}
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-sm flex items-center space-x-1"
          >
            <span>creditpromo.sav (SPSS Mail Promo)</span>
            <ArrowRight className="w-3 h-3 text-blue-500" />
          </button>
          <button
            onClick={() => onDatasetLoaded(IRIS_DATASET)}
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-sm flex items-center space-x-1"
          >
            <span>iris.csv (Fisher Iris)</span>
            <ArrowRight className="w-3 h-3 text-blue-500" />
          </button>
        </div>
      </div>

      {/* 3 Value Proposition Cards from Blueprint / Sample Image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">
            {lang === 'bn' ? 'অটো-ডিটেক্ট ভেরিয়েবল' : 'Auto-Detect'}
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            {lang === 'bn'
              ? 'স্বয়ংক্রিয়ভাবে Scale, Nominal ও Ordinal ভেরিয়েবল শনাক্তকরণ ও ম্যাপিং।'
              : 'Automatically identifies variable types, scales, and data column measurements.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">
            {lang === 'bn' ? 'ক্লিন ডেটা ও আউটলায়ার' : 'Clean Data'}
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            {lang === 'bn'
              ? 'মিসিং ভ্যালু ফিল্টারিং এবং অটোমেটিক ডেটা ক্লিনিং।'
              : 'Handles missing values, clean data types, and highlights statistical outliers.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-1">
            {lang === 'bn' ? 'এআই টেস্ট রেকমেন্ডেশন' : 'AI Suggestions'}
          </h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            {lang === 'bn'
              ? 'নরমালিটি ও ভ্যারিয়েন্স যাচাই করে উপযুক্ত টেস্ট (Welch\'s t / Mann-Whitney) সুপারিশ।'
              : 'Evaluates skewness, kurtosis and recommends the mathematically optimal test.'}
          </p>
        </div>
      </div>
    </div>
  );
};
