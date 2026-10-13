'use client';

import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  TrendingUp,
  BarChart3,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Info,
  Grid3X3,
  Split,
  Target,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Dataset,
  WelchTResult,
  DescriptiveStats,
  AnovaResult,
  CorrelationResult,
  PairedTResult,
  OneSampleTResult,
  ChiSquareResult,
} from '../types/dataset';
import {
  computeDescriptiveStats,
  computeWelchT,
  computeOneWayAnova,
  computeCorrelationMatrix,
  computePairedT,
  computeOneSampleT,
  computeChiSquare,
} from '../utils/statistics';

type AnalysisTab =
  | 'ttest'
  | 'anova'
  | 'correlation'
  | 'paired_t'
  | 'one_sample_t'
  | 'chisquare'
  | 'descriptives';

interface AnalysisViewProps {
  dataset: Dataset;
  lang: 'en' | 'bn';
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ dataset, lang }) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('ttest');
  const [copiedAPA, setCopiedAPA] = useState(false);

  // Column classifications
  const numericColumns = useMemo(
    () =>
      dataset.columns.filter(
        (c) => c.type === 'numeric' || c.type === 'dollar' || c.measure === 'scale'
      ),
    [dataset.columns]
  );

  const categoricalColumns = useMemo(
    () =>
      dataset.columns.filter(
        (c) => c.type === 'string' || c.measure === 'nominal' || c.measure === 'ordinal'
      ),
    [dataset.columns]
  );

  // 1. Independent T-Test & ANOVA parameters
  const [dependentVar, setDependentVar] = useState<string>(
    numericColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [groupingVar, setGroupingVar] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[1]?.name || ''
  );

  // 2. Paired T-Test parameters
  const [pairedVar1, setPairedVar1] = useState<string>(
    numericColumns[0]?.name || ''
  );
  const [pairedVar2, setPairedVar2] = useState<string>(
    numericColumns[1]?.name || numericColumns[0]?.name || ''
  );

  // 3. One-Sample T-Test parameters
  const [oneSampleVar, setOneSampleVar] = useState<string>(
    numericColumns[0]?.name || ''
  );
  const [testValue, setTestValue] = useState<number>(100);

  // 4. Correlation Matrix parameters
  const [selectedCorrVars, setSelectedCorrVars] = useState<string[]>(
    numericColumns.slice(0, 4).map((c) => c.name)
  );
  const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman'>('pearson');

  // 5. Chi-Square Crosstabs parameters
  const [chiRowVar, setChiRowVar] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [chiColVar, setChiColVar] = useState<string>(
    categoricalColumns[1]?.name || dataset.columns[1]?.name || ''
  );

  // Extract grouping levels for Independent T-Test and ANOVA
  const groupLevels = useMemo(() => {
    if (!groupingVar) return [];
    const set = new Set<string>();
    dataset.rows.forEach((r) => {
      const val = r[groupingVar];
      if (val !== null && val !== undefined && val !== '') {
        set.add(String(val));
      }
    });
    return Array.from(set);
  }, [dataset.rows, groupingVar]);

  // Calculations: Independent Samples Welch T-Test
  const tTestResult = useMemo<{
    welchResult: WelchTResult | null;
    desc1: DescriptiveStats | null;
    desc2: DescriptiveStats | null;
    error: string | null;
  }>(() => {
    if (!dependentVar || !groupingVar) {
      return { welchResult: null, desc1: null, desc2: null, error: 'Select both variables.' };
    }
    if (groupLevels.length < 2) {
      return {
        welchResult: null,
        desc1: null,
        desc2: null,
        error: `Grouping variable needs at least 2 distinct groups. Found: ${groupLevels.length}.`,
      };
    }
    const l1 = groupLevels[0];
    const l2 = groupLevels[1];
    const g1: number[] = [];
    const g2: number[] = [];

    dataset.rows.forEach((r) => {
      const gVal = String(r[groupingVar]);
      const raw = r[dependentVar];
      const num = typeof raw === 'number' ? raw : parseFloat(raw);
      if (!isNaN(num)) {
        if (gVal === l1) g1.push(num);
        else if (gVal === l2) g2.push(num);
      }
    });

    if (g1.length < 2 || g2.length < 2) {
      return {
        welchResult: null,
        desc1: null,
        desc2: null,
        error: 'Each group must have at least 2 numeric observations.',
      };
    }

    return {
      welchResult: computeWelchT(g1, g2, l1, l2),
      desc1: computeDescriptiveStats(g1, l1),
      desc2: computeDescriptiveStats(g2, l2),
      error: null,
    };
  }, [dataset.rows, dependentVar, groupingVar, groupLevels]);

  // Calculations: One-Way ANOVA
  const anovaResult = useMemo<AnovaResult | null>(() => {
    if (!dependentVar || !groupingVar || groupLevels.length < 2) return null;
    const groups = groupLevels.map((lvl) => {
      const values: number[] = [];
      dataset.rows.forEach((r) => {
        if (String(r[groupingVar]) === lvl) {
          const raw = r[dependentVar];
          const num = typeof raw === 'number' ? raw : parseFloat(raw);
          if (!isNaN(num)) values.push(num);
        }
      });
      return { name: lvl, values };
    });
    return computeOneWayAnova(groups, dependentVar, groupingVar);
  }, [dataset.rows, dependentVar, groupingVar, groupLevels]);

  // Calculations: Paired Samples T-Test
  const pairedTResult = useMemo<PairedTResult | null>(() => {
    if (!pairedVar1 || !pairedVar2 || pairedVar1 === pairedVar2) return null;
    const v1: number[] = [];
    const v2: number[] = [];
    dataset.rows.forEach((r) => {
      const x = parseFloat(r[pairedVar1]);
      const y = parseFloat(r[pairedVar2]);
      if (!isNaN(x) && !isNaN(y)) {
        v1.push(x);
        v2.push(y);
      }
    });
    if (v1.length < 3) return null;
    return computePairedT(v1, v2, pairedVar1, pairedVar2);
  }, [dataset.rows, pairedVar1, pairedVar2]);

  // Calculations: One-Sample T-Test
  const oneSampleResult = useMemo<OneSampleTResult | null>(() => {
    if (!oneSampleVar) return null;
    const vals: number[] = [];
    dataset.rows.forEach((r) => {
      const num = parseFloat(r[oneSampleVar]);
      if (!isNaN(num)) vals.push(num);
    });
    if (vals.length < 2) return null;
    return computeOneSampleT(vals, testValue, oneSampleVar);
  }, [dataset.rows, oneSampleVar, testValue]);

  // Calculations: Correlation Matrix
  const correlationResult = useMemo<CorrelationResult | null>(() => {
    if (selectedCorrVars.length < 2) return null;
    const varsData = selectedCorrVars.map((varName) => {
      const values: number[] = [];
      dataset.rows.forEach((r) => {
        const num = parseFloat(r[varName]);
        values.push(!isNaN(num) ? num : NaN);
      });
      return { name: varName, values };
    });
    return computeCorrelationMatrix(varsData, corrMethod);
  }, [dataset.rows, selectedCorrVars, corrMethod]);

  // Calculations: Chi-Square
  const chiSquareResult = useMemo<ChiSquareResult | null>(() => {
    if (!chiRowVar || !chiColVar || chiRowVar === chiColVar) return null;
    const rows: string[] = [];
    const cols: string[] = [];
    dataset.rows.forEach((r) => {
      rows.push(String(r[chiRowVar] ?? ''));
      cols.push(String(r[chiColVar] ?? ''));
    });
    return computeChiSquare(rows, cols, chiRowVar, chiColVar);
  }, [dataset.rows, chiRowVar, chiColVar]);

  // Calculations: Descriptives
  const descriptivesList = useMemo<DescriptiveStats[]>(() => {
    return numericColumns.map((col) => {
      const vals: number[] = [];
      dataset.rows.forEach((r) => {
        const num = parseFloat(r[col.name]);
        if (!isNaN(num)) vals.push(num);
      });
      return computeDescriptiveStats(vals, col.label || col.name);
    });
  }, [dataset.rows, numericColumns]);

  const copyAPA = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAPA(true);
    setTimeout(() => setCopiedAPA(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-85px)] bg-slate-100 overflow-hidden select-none">
      {/* Top Analysis Ribbon with all SPSS Tests */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center space-x-2 text-xs shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('ttest')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'ttest'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Independent t-Test</span>
        </button>

        <button
          onClick={() => setActiveTab('paired_t')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'paired_t'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Paired t-Test</span>
        </button>

        <button
          onClick={() => setActiveTab('one_sample_t')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'one_sample_t'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>One-Sample t-Test</span>
        </button>

        <button
          onClick={() => setActiveTab('anova')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'anova'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>One-Way ANOVA</span>
        </button>

        <button
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'correlation'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Correlation Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('chisquare')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'chisquare'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Split className="w-4 h-4" />
          <span>Crosstabs & Chi-Square</span>
        </button>

        <button
          onClick={() => setActiveTab('descriptives')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'descriptives'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Exploration & Descriptives</span>
        </button>
      </div>

      {/* Main Split Layout: Left Parameter Controls + Right Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Dynamic Parameters per Selected Test */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 flex flex-col space-y-4 overflow-y-auto">
          <div>
            <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'bn' ? 'টেস্ট ভেরিয়েবল নির্বাচন' : 'Variables Setup'}</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              {lang === 'bn' ? 'অ্যানালাইসিসের প্যারামিটার সেট করুন।' : 'Configure analysis variables.'}
            </p>
          </div>

          {/* 1. Independent T-Test & ANOVA Variables */}
          {(activeTab === 'ttest' || activeTab === 'anova') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dependent Variable (Metric):
                </label>
                <select
                  value={dependentVar}
                  onChange={(e) => setDependentVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grouping Factor Variable:
                </label>
                <select
                  value={groupingVar}
                  onChange={(e) => setGroupingVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {categoricalColumns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 2. Paired T-Test Variables */}
          {activeTab === 'paired_t' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 1 (Pre / Time 1):</label>
                <select
                  value={pairedVar1}
                  onChange={(e) => setPairedVar1(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 2 (Post / Time 2):</label>
                <select
                  value={pairedVar2}
                  onChange={(e) => setPairedVar2(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 3. One-Sample T-Test Variables */}
          {activeTab === 'one_sample_t' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Test Variable:</label>
                <select
                  value={oneSampleVar}
                  onChange={(e) => setOneSampleVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hypothesized Test Value (μ₀):</label>
                <input
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </>
          )}

          {/* 4. Correlation Matrix Variables */}
          {activeTab === 'correlation' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Method:</label>
                <select
                  value={corrMethod}
                  onChange={(e) => setCorrMethod(e.target.value as 'pearson' | 'spearman')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 mb-2"
                >
                  <option value="pearson">Pearson (Linear Metric)</option>
                  <option value="spearman">Spearman Rank (Monotonic/Ordinal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Matrix Variables:</label>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {numericColumns.map((col) => {
                    const isChecked = selectedCorrVars.includes(col.name);
                    return (
                      <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCorrVars([...selectedCorrVars, col.name]);
                            } else {
                              setSelectedCorrVars(selectedCorrVars.filter((v) => v !== col.name));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{col.label || col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* 5. Chi-Square Crosstabs Variables */}
          {activeTab === 'chisquare' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Row Variable:</label>
                <select
                  value={chiRowVar}
                  onChange={(e) => setChiRowVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {dataset.columns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Column Variable:</label>
                <select
                  value={chiColVar}
                  onChange={(e) => setChiColVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {dataset.columns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed">
            <div className="font-semibold flex items-center gap-1 mb-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>SPSS Statistical Standards</span>
            </div>
            {lang === 'bn'
              ? 'সকল টেস্টের আউটপুট স্বয়ংক্রিয়ভাবে APA 7th এডিশন ফরম্যাটে প্রস্তুত করা হয়।'
              : 'All calculations conform to IBM SPSS algorithms with automated APA 7th Edition reporting.'}
          </div>
        </div>

        {/* Right Side: Detailed Results Output Tables */}
        <div className="flex-1 bg-white p-6 overflow-y-auto space-y-6">
          {/* TAB 1: INDEPENDENT SAMPLES T-TEST */}
          {activeTab === 'ttest' && (
            <>
              {tTestResult.error ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3 text-amber-800 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>{tTestResult.error}</span>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">
                      Group Statistics (Descriptives)
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Group</th>
                            <th className="px-4 py-2.5 text-right">N</th>
                            <th className="px-4 py-2.5 text-right">Mean</th>
                            <th className="px-4 py-2.5 text-right">Std. Deviation</th>
                            <th className="px-4 py-2.5 text-right">Median</th>
                            <th className="px-4 py-2.5 text-center">Normality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                          {[tTestResult.desc1, tTestResult.desc2].map((desc, i) =>
                            desc ? (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{desc.variable}</td>
                                <td className="px-4 py-2.5 text-right">{desc.n}</td>
                                <td className="px-4 py-2.5 text-right">{desc.mean.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right">{desc.stdDev.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right">{desc.median.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-center font-sans">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${desc.isNormal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {desc.isNormal ? 'Normal' : 'Non-Normal'}
                                  </span>
                                </td>
                              </tr>
                            ) : null
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {tTestResult.welchResult && (
                    <>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">
                          Independent Samples Test (Welch&apos;s)
                        </h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                              <tr>
                                <th className="px-4 py-2.5">Statistic</th>
                                <th className="px-4 py-2.5 text-right">t</th>
                                <th className="px-4 py-2.5 text-right">df</th>
                                <th className="px-4 py-2.5 text-right">p-value (2-tailed)</th>
                                <th className="px-4 py-2.5 text-right">Mean Diff</th>
                                <th className="px-4 py-2.5 text-right">Cohen&apos;s d</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                              <tr>
                                <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Equal variances not assumed</td>
                                <td className="px-4 py-2.5 text-right font-bold text-blue-600">{tTestResult.welchResult.tStatistic.toFixed(3)}</td>
                                <td className="px-4 py-2.5 text-right">{tTestResult.welchResult.df.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right font-bold">{tTestResult.welchResult.pValue < 0.001 ? '< .001' : tTestResult.welchResult.pValue.toFixed(4)}</td>
                                <td className="px-4 py-2.5 text-right">{(tTestResult.welchResult.mean1 - tTestResult.welchResult.mean2).toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right">{tTestResult.welchResult.cohensD.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            <span>APA 7th Edition Statement</span>
                          </span>
                          <button
                            onClick={() => copyAPA(tTestResult.welchResult!.apaStatement)}
                            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                          >
                            {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                          &ldquo;{tTestResult.welchResult.apaStatement}&rdquo;
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB 2: ONE-WAY ANOVA */}
          {activeTab === 'anova' && anovaResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">ANOVA Summary Table</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Source</th>
                        <th className="px-4 py-2.5 text-right">Sum of Squares (SS)</th>
                        <th className="px-4 py-2.5 text-right">df</th>
                        <th className="px-4 py-2.5 text-right">Mean Square (MS)</th>
                        <th className="px-4 py-2.5 text-right">F</th>
                        <th className="px-4 py-2.5 text-right">p-value (Sig.)</th>
                        <th className="px-4 py-2.5 text-right">η² (Eta Sq.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Between Groups</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.ssBetween.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.dfBetween}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.msBetween.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">{anovaResult.fStatistic.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{anovaResult.pValue < 0.001 ? '< .001' : anovaResult.pValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.etaSquared.toFixed(3)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Within Groups</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.ssWithin.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.dfWithin}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.msWithin.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                      </tr>
                      <tr className="bg-slate-50 font-semibold">
                        <td className="px-4 py-2.5 font-sans text-slate-900">Total</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.ssTotal.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.dfTotal}</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pairwise Post-Hoc Comparisons */}
              {anovaResult.postHoc.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Post-Hoc Multiple Comparisons (Tukey HSD)</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <th className="px-4 py-2">Pairwise Comparison</th>
                          <th className="px-4 py-2 text-right">Mean Difference</th>
                          <th className="px-4 py-2 text-right">Adjusted p-value</th>
                          <th className="px-4 py-2 text-center">Significant (p &lt; .05)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {anovaResult.postHoc.map((ph, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-sans font-medium text-slate-800">{ph.comparison}</td>
                            <td className="px-4 py-2 text-right">{ph.diff.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-bold">{ph.pValue < 0.001 ? '< .001' : ph.pValue.toFixed(4)}</td>
                            <td className="px-4 py-2 text-center font-sans">
                              {ph.isSignificant ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Yes</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>APA 7th Edition Statement</span>
                  </span>
                  <button
                    onClick={() => copyAPA(anovaResult.apaStatement)}
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                  >
                    {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{anovaResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PAIRED SAMPLES T-TEST */}
          {activeTab === 'paired_t' && pairedTResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Paired Samples Test</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Pair Comparison</th>
                        <th className="px-4 py-2.5 text-right">Mean 1</th>
                        <th className="px-4 py-2.5 text-right">Mean 2</th>
                        <th className="px-4 py-2.5 text-right">Mean Diff</th>
                        <th className="px-4 py-2.5 text-right">t</th>
                        <th className="px-4 py-2.5 text-right">df</th>
                        <th className="px-4 py-2.5 text-right">p-value</th>
                        <th className="px-4 py-2.5 text-right">Cohen&apos;s d</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{pairedTResult.var1Name} - {pairedTResult.var2Name}</td>
                        <td className="px-4 py-2.5 text-right">{pairedTResult.mean1.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{pairedTResult.mean2.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{pairedTResult.meanDiff.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">{pairedTResult.tStatistic.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right">{pairedTResult.df}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{pairedTResult.pValue < 0.001 ? '< .001' : pairedTResult.pValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right">{pairedTResult.cohensD.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>APA 7th Edition Statement</span>
                  </span>
                  <button
                    onClick={() => copyAPA(pairedTResult.apaStatement)}
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                  >
                    {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{pairedTResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ONE-SAMPLE T-TEST */}
          {activeTab === 'one_sample_t' && oneSampleResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">One-Sample Test (Test Value = {oneSampleResult.testValue})</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Variable</th>
                        <th className="px-4 py-2.5 text-right">Sample Mean</th>
                        <th className="px-4 py-2.5 text-right">Mean Diff</th>
                        <th className="px-4 py-2.5 text-right">t</th>
                        <th className="px-4 py-2.5 text-right">df</th>
                        <th className="px-4 py-2.5 text-right">p-value</th>
                        <th className="px-4 py-2.5 text-right">Cohen&apos;s d</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{oneSampleResult.varName}</td>
                        <td className="px-4 py-2.5 text-right">{oneSampleResult.mean.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{oneSampleResult.meanDiff.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">{oneSampleResult.tStatistic.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right">{oneSampleResult.df}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{oneSampleResult.pValue < 0.001 ? '< .001' : oneSampleResult.pValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right">{oneSampleResult.cohensD.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>APA 7th Edition Statement</span>
                  </span>
                  <button
                    onClick={() => copyAPA(oneSampleResult.apaStatement)}
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                  >
                    {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{oneSampleResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: BIVARIATE CORRELATION MATRIX */}
          {activeTab === 'correlation' && correlationResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">
                  Correlation Matrix ({correlationResult.method === 'pearson' ? 'Pearson r' : 'Spearman ρ'})
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Variable</th>
                        {correlationResult.variables.map((v) => (
                          <th key={v} className="px-4 py-2.5 text-right">{v}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {correlationResult.variables.map((rowVar) => (
                        <tr key={rowVar} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{rowVar}</td>
                          {correlationResult.variables.map((colVar) => {
                            const cell = correlationResult.matrix[rowVar][colVar];
                            return (
                              <td key={colVar} className="px-4 py-2.5 text-right">
                                <div className="font-bold text-slate-900">
                                  {cell.r.toFixed(3)}
                                  {cell.isSignificant01 ? '**' : cell.isSignificant05 ? '*' : ''}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  p = {cell.pValue < 0.001 ? '< .001' : cell.pValue.toFixed(3)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  * Correlation is significant at the 0.05 level (2-tailed). ** Correlation is significant at the 0.01 level (2-tailed).
                </div>
              </div>

              {correlationResult.apaStatements.length > 0 && (
                <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>APA 7th Edition Statements</span>
                    </span>
                    <button
                      onClick={() => copyAPA(correlationResult.apaStatements.join(' '))}
                      className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                    >
                      {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedAPA ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>
                  <div className="space-y-1 font-serif italic text-xs text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {correlationResult.apaStatements.map((stmt, i) => (
                      <p key={i}>&ldquo;{stmt}&rdquo;</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CHI-SQUARE CROSSTABULATION */}
          {activeTab === 'chisquare' && chiSquareResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">
                  {chiSquareResult.rowVar} * {chiSquareResult.colVar} Crosstabulation
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2">{chiSquareResult.rowVar}</th>
                        <th className="px-4 py-2">Count Type</th>
                        {chiSquareResult.colCategories.map((c) => (
                          <th key={c} className="px-4 py-2 text-right">{c}</th>
                        ))}
                        <th className="px-4 py-2 text-right bg-slate-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {chiSquareResult.rowCategories.map((r) => (
                        <React.Fragment key={r}>
                          <tr className="hover:bg-slate-50">
                            <td rowSpan={2} className="px-4 py-2 font-sans font-medium text-slate-900 border-r border-slate-200">{r}</td>
                            <td className="px-4 py-1.5 font-sans text-slate-500">Observed</td>
                            {chiSquareResult.colCategories.map((c) => (
                              <td key={c} className="px-4 py-1.5 text-right font-bold text-slate-900">{chiSquareResult.observed[r][c]}</td>
                            ))}
                            <td className="px-4 py-1.5 text-right font-bold bg-slate-50">{chiSquareResult.rowTotals[r]}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 text-slate-400 border-b border-slate-200">
                            <td className="px-4 py-1.5 font-sans text-slate-400">Expected</td>
                            {chiSquareResult.colCategories.map((c) => (
                              <td key={c} className="px-4 py-1.5 text-right">{chiSquareResult.expected[r][c].toFixed(1)}</td>
                            ))}
                            <td className="px-4 py-1.5 text-right bg-slate-50">{chiSquareResult.rowTotals[r]}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                      <tr className="bg-slate-100 font-semibold">
                        <td colSpan={2} className="px-4 py-2 font-sans text-slate-900">Total</td>
                        {chiSquareResult.colCategories.map((c) => (
                          <td key={c} className="px-4 py-2 text-right">{chiSquareResult.colTotals[c]}</td>
                        ))}
                        <td className="px-4 py-2 text-right font-bold">{chiSquareResult.grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chi-Square Tests Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">Chi-Square Tests</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2">Test</th>
                        <th className="px-4 py-2 text-right">Value (χ²)</th>
                        <th className="px-4 py-2 text-right">df</th>
                        <th className="px-4 py-2 text-right">Asymptotic Sig. (2-sided)</th>
                        <th className="px-4 py-2 text-right">Cramér&apos;s V</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Pearson Chi-Square</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">{chiSquareResult.chiSquare.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right">{chiSquareResult.df}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{chiSquareResult.pValue < 0.001 ? '< .001' : chiSquareResult.pValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right">{chiSquareResult.cramersV.toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>APA 7th Edition Statement</span>
                  </span>
                  <button
                    onClick={() => copyAPA(chiSquareResult.apaStatement)}
                    className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                  >
                    {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{chiSquareResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: EXPLORATION & DESCRIPTIVES */}
          {activeTab === 'descriptives' && (
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Descriptive Statistics Exploration</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Variable</th>
                      <th className="px-4 py-2.5 text-right">N</th>
                      <th className="px-4 py-2.5 text-right">Mean</th>
                      <th className="px-4 py-2.5 text-right">Std. Deviation</th>
                      <th className="px-4 py-2.5 text-right">Median</th>
                      <th className="px-4 py-2.5 text-right">Min</th>
                      <th className="px-4 py-2.5 text-right">Max</th>
                      <th className="px-4 py-2.5 text-right">Skewness</th>
                      <th className="px-4 py-2.5 text-right">Kurtosis</th>
                      <th className="px-4 py-2.5 text-center">Normality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {descriptivesList.map((d) => (
                      <tr key={d.variable} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{d.variable}</td>
                        <td className="px-4 py-2.5 text-right">{d.n}</td>
                        <td className="px-4 py-2.5 text-right">{d.mean.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{d.stdDev.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{d.median.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{d.min.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{d.max.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{d.skewness.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right">{d.kurtosis.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${d.isNormal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {d.isNormal ? 'Normal' : 'Non-Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
