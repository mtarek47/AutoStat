'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ShieldCheck,
  Binary,
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
  RegressionResult,
  ReliabilityResult,
  MannWhitneyResult,
  KruskalWallisResult,
  LogisticRegressionResult,
  WilcoxonResult,
} from '../types/dataset';
import {
  computeDescriptiveStats,
  computeWelchT,
  computeOneWayAnova,
  computeCorrelationMatrix,
  computePairedT,
  computeOneSampleT,
  computeChiSquare,
  computeMultipleRegression,
  computeReliabilityAnalysis,
  computeMannWhitney,
  computeKruskalWallis,
  computeLogisticRegression,
  computeWilcoxonSignedRank,
} from '../utils/statistics';

export type AnalysisTab =
  | 'ttest'
  | 'anova'
  | 'regression'
  | 'logistic'
  | 'reliability'
  | 'mann_whitney'
  | 'wilcoxon'
  | 'kruskal_wallis'
  | 'correlation'
  | 'paired_t'
  | 'one_sample_t'
  | 'chisquare'
  | 'descriptives';

interface AnalysisViewProps {
  dataset: Dataset;
  initialTab?: string;
  lang: 'en' | 'bn';
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ dataset, initialTab, lang }) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>(
    (initialTab as AnalysisTab) || 'ttest'
  );
  const [copiedAPA, setCopiedAPA] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as AnalysisTab);
    }
  }, [initialTab]);

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

  // 1. Independent T-Test, ANOVA, Mann-Whitney, Kruskal-Wallis variables
  const [dependentVar, setDependentVar] = useState<string>(
    numericColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [groupingVar, setGroupingVar] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[1]?.name || ''
  );

  // 2. Paired T-Test
  const [pairedVar1, setPairedVar1] = useState<string>(numericColumns[0]?.name || '');
  const [pairedVar2, setPairedVar2] = useState<string>(
    numericColumns[1]?.name || numericColumns[0]?.name || ''
  );

  // 3. One-Sample T-Test
  const [oneSampleVar, setOneSampleVar] = useState<string>(numericColumns[0]?.name || '');
  const [testValue, setTestValue] = useState<number>(100);

  // 4. Multiple Regression
  const [regDepVar, setRegDepVar] = useState<string>(numericColumns[0]?.name || '');
  const [regPredictors, setRegPredictors] = useState<string[]>(
    numericColumns.slice(1, 4).map((c) => c.name)
  );

  // 5. Reliability Analysis (Cronbach's Alpha)
  const [scaleItems, setScaleItems] = useState<string[]>(
    numericColumns.slice(0, 5).map((c) => c.name)
  );

  // 6. Correlation Matrix
  const [selectedCorrVars, setSelectedCorrVars] = useState<string[]>(
    numericColumns.slice(0, 4).map((c) => c.name)
  );
  const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman'>('pearson');

  // 7. Chi-Square Crosstabs
  const [chiRowVar, setChiRowVar] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [chiColVar, setChiColVar] = useState<string>(
    categoricalColumns[1]?.name || dataset.columns[1]?.name || ''
  );

  // 8. Binary Logistic Regression
  const [logDepVar, setLogDepVar] = useState<string>(
    categoricalColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [logCovariates, setLogCovariates] = useState<string[]>(
    numericColumns.slice(0, 3).map((c) => c.name)
  );

  // 9. Wilcoxon Signed-Rank Test
  const [wilcoxVar1, setWilcoxVar1] = useState<string>(numericColumns[0]?.name || '');
  const [wilcoxVar2, setWilcoxVar2] = useState<string>(
    numericColumns[1]?.name || numericColumns[0]?.name || ''
  );

  // Extract grouping levels
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

  // 1. Calculations: Independent Samples Welch T-Test
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
        error: `Grouping variable needs at least 2 groups. Found: ${groupLevels.length}.`,
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

  // 2. Calculations: One-Way ANOVA
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

  // 3. Calculations: Multiple Linear Regression
  const regressionResult = useMemo<RegressionResult | null>(() => {
    if (!regDepVar || regPredictors.length === 0) return null;
    const yData: number[] = dataset.rows.map((r) => parseFloat(r[regDepVar]));
    const xMatrix: number[][] = regPredictors.map((pred) =>
      dataset.rows.map((r) => parseFloat(r[pred]))
    );
    return computeMultipleRegression(yData, xMatrix, regDepVar, regPredictors);
  }, [dataset.rows, regDepVar, regPredictors]);

  // 4. Calculations: Reliability Analysis (Cronbach's Alpha)
  const reliabilityResult = useMemo<ReliabilityResult | null>(() => {
    if (scaleItems.length < 2) return null;
    const itemData = scaleItems.map((name) => ({
      name,
      values: dataset.rows.map((r) => parseFloat(r[name])),
    }));
    return computeReliabilityAnalysis(itemData);
  }, [dataset.rows, scaleItems]);

  // 5. Calculations: Mann-Whitney U Test
  const mannWhitneyResult = useMemo<MannWhitneyResult | null>(() => {
    if (!dependentVar || !groupingVar || groupLevels.length < 2) return null;
    const l1 = groupLevels[0];
    const l2 = groupLevels[1];
    const g1: number[] = [];
    const g2: number[] = [];
    dataset.rows.forEach((r) => {
      const gVal = String(r[groupingVar]);
      const num = parseFloat(r[dependentVar]);
      if (!isNaN(num)) {
        if (gVal === l1) g1.push(num);
        else if (gVal === l2) g2.push(num);
      }
    });
    if (g1.length < 2 || g2.length < 2) return null;
    return computeMannWhitney(g1, g2, l1, l2, dependentVar, groupingVar);
  }, [dataset.rows, dependentVar, groupingVar, groupLevels]);

  // 6. Calculations: Kruskal-Wallis H Test
  const kruskalWallisResult = useMemo<KruskalWallisResult | null>(() => {
    if (!dependentVar || !groupingVar || groupLevels.length < 2) return null;
    const groups = groupLevels.map((lvl) => {
      const values: number[] = [];
      dataset.rows.forEach((r) => {
        if (String(r[groupingVar]) === lvl) {
          const num = parseFloat(r[dependentVar]);
          if (!isNaN(num)) values.push(num);
        }
      });
      return { name: lvl, values };
    });
    return computeKruskalWallis(groups, dependentVar, groupingVar);
  }, [dataset.rows, dependentVar, groupingVar, groupLevels]);

  // 7. Calculations: Paired T-Test
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

  // 8. Calculations: One-Sample T-Test
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

  // 9. Calculations: Correlation Matrix
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

  // 10. Calculations: Chi-Square
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

  // 11. Calculations: Descriptives
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

  // 12. Calculations: Binary Logistic Regression
  const logisticResult = useMemo<LogisticRegressionResult | null>(() => {
    if (!logDepVar || logCovariates.length === 0) return null;
    try {
      return computeLogisticRegression(dataset.rows, logDepVar, logCovariates);
    } catch {
      return null;
    }
  }, [dataset.rows, logDepVar, logCovariates]);

  // 13. Calculations: Wilcoxon Signed-Rank Test
  const wilcoxonResult = useMemo<WilcoxonResult | null>(() => {
    if (!wilcoxVar1 || !wilcoxVar2 || wilcoxVar1 === wilcoxVar2) return null;
    try {
      return computeWilcoxonSignedRank(dataset.rows, wilcoxVar1, wilcoxVar2);
    } catch {
      return null;
    }
  }, [dataset.rows, wilcoxVar1, wilcoxVar2]);

  const copyAPA = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAPA(true);
    setTimeout(() => setCopiedAPA(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden select-none">
      {/* Top Analysis Ribbon with all SPSS Tests */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center space-x-1.5 text-xs shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('ttest')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'ttest' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Independent t</span>
        </button>

        <button
          onClick={() => setActiveTab('anova')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'anova' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>One-Way ANOVA</span>
        </button>

        <button
          onClick={() => setActiveTab('regression')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'regression' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Linear Regression</span>
        </button>

        <button
          onClick={() => setActiveTab('logistic')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'logistic' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Binary Logistic</span>
        </button>

        <button
          onClick={() => setActiveTab('reliability')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'reliability' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Reliability (α)</span>
        </button>

        <button
          onClick={() => setActiveTab('mann_whitney')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'mann_whitney' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Mann-Whitney U</span>
        </button>

        <button
          onClick={() => setActiveTab('wilcoxon')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'wilcoxon' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Wilcoxon W</span>
        </button>

        <button
          onClick={() => setActiveTab('kruskal_wallis')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'kruskal_wallis' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Kruskal-Wallis H</span>
        </button>

        <button
          onClick={() => setActiveTab('paired_t')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'paired_t' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Paired t</span>
        </button>

        <button
          onClick={() => setActiveTab('one_sample_t')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'one_sample_t' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>One-Sample t</span>
        </button>

        <button
          onClick={() => setActiveTab('correlation')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'correlation' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>Correlations</span>
        </button>

        <button
          onClick={() => setActiveTab('chisquare')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'chisquare' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Split className="w-3.5 h-3.5" />
          <span>Crosstabs & χ²</span>
        </button>

        <button
          onClick={() => setActiveTab('descriptives')}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeTab === 'descriptives' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Descriptives</span>
        </button>
      </div>

      {/* Main Split Layout: Left Parameter Controls + Right Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Parameters per Test */}
        <div className="w-72 bg-white border-r border-slate-200 p-4 flex flex-col space-y-4 overflow-y-auto">
          <div>
            <h4 className="font-semibold text-xs text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SPSS Parameters</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              {lang === 'bn' ? 'অ্যানালাইসিসের ভেরিয়েবল সেট করুন।' : 'Configure variable parameters.'}
            </p>
          </div>

          {/* Grouping / Dependent Tests */}
          {(activeTab === 'ttest' ||
            activeTab === 'anova' ||
            activeTab === 'mann_whitney' ||
            activeTab === 'kruskal_wallis') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dependent Variable (Metric / Test Variable):
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
                  Grouping Variable (Factor):
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

          {/* Regression Parameters */}
          {activeTab === 'regression' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dependent Variable (Y):
                </label>
                <select
                  value={regDepVar}
                  onChange={(e) => setRegDepVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 mb-2"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Independent Predictor Variables (X):
                </label>
                <div className="space-y-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {numericColumns
                    .filter((c) => c.name !== regDepVar)
                    .map((col) => {
                      const isChecked = regPredictors.includes(col.name);
                      return (
                        <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setRegPredictors([...regPredictors, col.name]);
                              else setRegPredictors(regPredictors.filter((v) => v !== col.name));
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="truncate">{col.label || col.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Binary Logistic Regression Parameters */}
          {activeTab === 'logistic' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dependent Variable (Binary 0/1):
                </label>
                <select
                  value={logDepVar}
                  onChange={(e) => setLogDepVar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 mb-2"
                >
                  {dataset.columns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Covariates (Predictor Variables):
                </label>
                <div className="space-y-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {numericColumns
                    .filter((c) => c.name !== logDepVar)
                    .map((col) => {
                      const isChecked = logCovariates.includes(col.name);
                      return (
                        <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setLogCovariates([...logCovariates, col.name]);
                              else setLogCovariates(logCovariates.filter((v) => v !== col.name));
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="truncate">{col.label || col.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Reliability Analysis Parameters */}
          {activeTab === 'reliability' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scale Items (Questionnaire Items):
              </label>
              <div className="space-y-1 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                {numericColumns.map((col) => {
                  const isChecked = scaleItems.includes(col.name);
                  return (
                    <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setScaleItems([...scaleItems, col.name]);
                          else setScaleItems(scaleItems.filter((v) => v !== col.name));
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="truncate">{col.label || col.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paired T-Test */}
          {activeTab === 'paired_t' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 1 (Pre):</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 2 (Post):</label>
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

          {/* Wilcoxon Signed-Rank Test */}
          {activeTab === 'wilcoxon' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 1 (Pre / Baseline):</label>
                <select
                  value={wilcoxVar1}
                  onChange={(e) => setWilcoxVar1(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variable 2 (Post / Follow-up):</label>
                <select
                  value={wilcoxVar2}
                  onChange={(e) => setWilcoxVar2(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>{c.label || c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* One-Sample T-Test */}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hypothesized Value (μ₀):</label>
                <input
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </>
          )}

          {/* Correlation Parameters */}
          {activeTab === 'correlation' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Method:</label>
                <select
                  value={corrMethod}
                  onChange={(e) => setCorrMethod(e.target.value as 'pearson' | 'spearman')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 mb-2"
                >
                  <option value="pearson">Pearson (Metric)</option>
                  <option value="spearman">Spearman (Rank)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Variables:</label>
                <div className="space-y-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                  {numericColumns.map((col) => {
                    const isChecked = selectedCorrVars.includes(col.name);
                    return (
                      <label key={col.name} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCorrVars([...selectedCorrVars, col.name]);
                            else setSelectedCorrVars(selectedCorrVars.filter((v) => v !== col.name));
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="truncate">{col.label || col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Chi-Square Parameters */}
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
              <span>SPSS Reporting Standard</span>
            </div>
            {lang === 'bn'
              ? 'সকল ফলাফল জার্নালে ব্যবহারের উপযোগী APA 7th Edition নারেটিভ ও পিভট টেবিলে প্রস্তুত হয়।'
              : 'Statistical outputs conform strictly to IBM SPSS algorithms with automated APA 7th Edition reporting.'}
          </div>
        </div>

        {/* Right Side: Detailed Results Output Tables */}
        <div className="flex-1 bg-white p-6 overflow-y-auto space-y-6">
          {/* TAB: MULTIPLE LINEAR REGRESSION */}
          {activeTab === 'regression' && (
            <>
              {regressionResult ? (
                <div className="space-y-6">
                  {/* Model Summary Table */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Model Summary</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Model</th>
                            <th className="px-4 py-2.5 text-right">R</th>
                            <th className="px-4 py-2.5 text-right">R Square (R²)</th>
                            <th className="px-4 py-2.5 text-right">Adjusted R²</th>
                            <th className="px-4 py-2.5 text-right">Std. Error of the Estimate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">1 (Enter)</td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-600">{regressionResult.r.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{regressionResult.rSquared.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{regressionResult.adjRSquared.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{regressionResult.stdErrorEstimate.toFixed(3)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ANOVA Table */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">ANOVA Model Significance</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Source</th>
                            <th className="px-4 py-2 text-right">Sum of Squares</th>
                            <th className="px-4 py-2 text-right">df</th>
                            <th className="px-4 py-2 text-right">Mean Square</th>
                            <th className="px-4 py-2 text-right">F</th>
                            <th className="px-4 py-2 text-right">Sig. (p-value)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2 font-sans font-medium text-slate-900">Regression</td>
                            <td className="px-4 py-2 text-right">{regressionResult.ssRegression.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{regressionResult.dfRegression}</td>
                            <td className="px-4 py-2 text-right">{regressionResult.msRegression.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-600">{regressionResult.fStatistic.toFixed(3)}</td>
                            <td className="px-4 py-2 text-right font-bold">{regressionResult.fPValue < 0.001 ? '< .001' : regressionResult.fPValue.toFixed(4)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-sans text-slate-700">Residual</td>
                            <td className="px-4 py-2 text-right">{regressionResult.ssResidual.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{regressionResult.dfResidual}</td>
                            <td className="px-4 py-2 text-right">{regressionResult.msResidual.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                          </tr>
                          <tr className="bg-slate-50 font-semibold">
                            <td className="px-4 py-2 font-sans text-slate-900">Total</td>
                            <td className="px-4 py-2 text-right">{regressionResult.ssTotal.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{regressionResult.dfTotal}</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Coefficients Table */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Coefficients</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Model Term</th>
                            <th className="px-4 py-2 text-right">B (Unstandardized)</th>
                            <th className="px-4 py-2 text-right">Std. Error</th>
                            <th className="px-4 py-2 text-right">Beta (Standardized)</th>
                            <th className="px-4 py-2 text-right">t</th>
                            <th className="px-4 py-2 text-right">Sig. (p)</th>
                            <th className="px-4 py-2 text-right">95% CI</th>
                            <th className="px-4 py-2 text-right">VIF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {regressionResult.coefficients.map((coef, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-sans font-medium text-slate-900">{coef.term}</td>
                              <td className="px-4 py-2 text-right font-bold">{coef.b.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{coef.stdError.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{coef.term === '(Constant)' ? '-' : coef.beta.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right font-bold text-blue-600">{coef.t.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right font-bold">{coef.pValue < 0.001 ? '< .001' : coef.pValue.toFixed(4)}</td>
                              <td className="px-4 py-2 text-right text-[10px] text-slate-500">[{coef.ciLower.toFixed(2)}, {coef.ciUpper.toFixed(2)}]</td>
                              <td className="px-4 py-2 text-right">{coef.term === '(Constant)' ? '-' : coef.vif.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* APA Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>APA 7th Edition Statement</span>
                      </span>
                      <button
                        onClick={() => copyAPA(regressionResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{regressionResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select a dependent variable and at least one predictor.</div>
              )}
            </>
          )}

          {/* TAB: BINARY LOGISTIC REGRESSION */}
          {activeTab === 'logistic' && (
            <>
              {logisticResult ? (
                <div className="space-y-6">
                  {/* Omnibus Tests */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Omnibus Tests of Model Coefficients</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Step / Model</th>
                            <th className="px-4 py-2.5 text-right">Chi-Square (χ²)</th>
                            <th className="px-4 py-2.5 text-right">df</th>
                            <th className="px-4 py-2.5 text-right">Sig. (p)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Step 1 (Model)</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{logisticResult.omnibusChiSquare.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{logisticResult.omnibusDf}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{logisticResult.omnibusPValue < 0.001 ? '< .001' : logisticResult.omnibusPValue.toFixed(4)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Model Summary */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Model Summary</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">-2 Log likelihood</th>
                            <th className="px-4 py-2 text-right">Cox & Snell R Square</th>
                            <th className="px-4 py-2 text-right">Nagelkerke R Square</th>
                            <th className="px-4 py-2 text-right">Overall Accuracy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5">{logisticResult.minus2LogLikelihood.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{logisticResult.coxSnellR2.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{logisticResult.nagelkerkeR2.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-600">{logisticResult.overallPercentageCorrect.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Classification Table */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Classification Table (Cut-off = 0.50)</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Observed Group</th>
                            <th className="px-4 py-2 text-right">Predicted 0</th>
                            <th className="px-4 py-2 text-right">Predicted 1</th>
                            <th className="px-4 py-2 text-right">Percentage Correct</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2 font-sans font-medium text-slate-900">{logisticResult.dependentVar} = 0</td>
                            <td className="px-4 py-2 text-right">{logisticResult.classificationTable.observed0Predicted0}</td>
                            <td className="px-4 py-2 text-right">{logisticResult.classificationTable.observed0Predicted1}</td>
                            <td className="px-4 py-2 text-right font-semibold">{logisticResult.classificationTable.percentCorrect0.toFixed(1)}%</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-sans font-medium text-slate-900">{logisticResult.dependentVar} = 1</td>
                            <td className="px-4 py-2 text-right">{logisticResult.classificationTable.observed1Predicted0}</td>
                            <td className="px-4 py-2 text-right">{logisticResult.classificationTable.observed1Predicted1}</td>
                            <td className="px-4 py-2 text-right font-semibold">{logisticResult.classificationTable.percentCorrect1.toFixed(1)}%</td>
                          </tr>
                          <tr className="bg-slate-50 font-semibold">
                            <td className="px-4 py-2 font-sans text-slate-900">Overall Percentage</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-700">{logisticResult.classificationTable.totalPercentCorrect.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Variables in the Equation */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Variables in the Equation</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Variable</th>
                            <th className="px-4 py-2 text-right">B</th>
                            <th className="px-4 py-2 text-right">S.E.</th>
                            <th className="px-4 py-2 text-right">Wald</th>
                            <th className="px-4 py-2 text-right">df</th>
                            <th className="px-4 py-2 text-right">Sig. (p)</th>
                            <th className="px-4 py-2 text-right">Exp(B)</th>
                            <th className="px-4 py-2 text-right">95% CI Lower</th>
                            <th className="px-4 py-2 text-right">95% CI Upper</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {logisticResult.coefficients.map((c) => (
                            <tr key={c.term} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-sans font-medium text-slate-900">{c.term}</td>
                              <td className="px-4 py-2 text-right">{c.b.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{c.se.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{c.wald.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{c.df}</td>
                              <td className="px-4 py-2 text-right font-bold">{c.pValue < 0.001 ? '< .001' : c.pValue.toFixed(4)}</td>
                              <td className="px-4 py-2 text-right font-bold text-emerald-600">{c.expB.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{c.ciLowerExpB.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right">{c.ciUpperExpB.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* APA Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>APA 7th Edition Statement</span>
                      </span>
                      <button
                        onClick={() => copyAPA(logisticResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{logisticResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select a binary dependent variable and covariates.</div>
              )}
            </>
          )}

          {/* TAB: RELIABILITY ANALYSIS (CRONBACH'S ALPHA) */}
          {activeTab === 'reliability' && (
            <>
              {reliabilityResult ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Reliability Statistics</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Cronbach&apos;s Alpha (α)</th>
                            <th className="px-4 py-2.5 text-right">N of Items</th>
                            <th className="px-4 py-2.5 text-right">Valid Cases</th>
                            <th className="px-4 py-2.5 text-right">Scale Mean</th>
                            <th className="px-4 py-2.5 text-right">Scale Variance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-amber-600 text-sm">{reliabilityResult.cronbachAlpha.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{reliabilityResult.nItems}</td>
                            <td className="px-4 py-2.5 text-right">{reliabilityResult.nCases}</td>
                            <td className="px-4 py-2.5 text-right">{reliabilityResult.scaleMean.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{reliabilityResult.scaleVariance.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Item-Total Statistics Table */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Item-Total Statistics</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Item Variable</th>
                            <th className="px-4 py-2 text-right">Scale Mean if Item Deleted</th>
                            <th className="px-4 py-2 text-right">Scale Variance if Item Deleted</th>
                            <th className="px-4 py-2 text-right">Corrected Item-Total Correlation</th>
                            <th className="px-4 py-2 text-right font-bold text-amber-700">Cronbach&apos;s Alpha if Item Deleted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {reliabilityResult.itemStats.map((it) => (
                            <tr key={it.item} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-sans font-medium text-slate-900">{it.item}</td>
                              <td className="px-4 py-2 text-right">{it.scaleMeanIfDeleted.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">{it.scaleVarianceIfDeleted.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-bold text-blue-600">{it.correctedItemTotalCorr.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right font-bold text-amber-600">{it.cronbachAlphaIfDeleted.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* APA Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>APA 7th Edition Statement</span>
                      </span>
                      <button
                        onClick={() => copyAPA(reliabilityResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{reliabilityResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select at least 2 questionnaire items.</div>
              )}
            </>
          )}

          {/* TAB: MANN-WHITNEY U TEST */}
          {activeTab === 'mann_whitney' && (
            <>
              {mannWhitneyResult ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Ranks Table</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Group Factor</th>
                            <th className="px-4 py-2.5 text-right">N</th>
                            <th className="px-4 py-2.5 text-right">Mean Rank</th>
                            <th className="px-4 py-2.5 text-right">Sum of Ranks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{mannWhitneyResult.group1Name}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.n1}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.meanRank1.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.sumRanks1.toFixed(1)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{mannWhitneyResult.group2Name}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.n2}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.meanRank2.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.sumRanks2.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Test Statistics</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Mann-Whitney U</th>
                            <th className="px-4 py-2 text-right">Wilcoxon W</th>
                            <th className="px-4 py-2 text-right">Z</th>
                            <th className="px-4 py-2 text-right">Asymp. Sig. (2-tailed)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-purple-600">{mannWhitneyResult.uStatistic.toFixed(1)}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.wStatistic.toFixed(1)}</td>
                            <td className="px-4 py-2.5 text-right">{mannWhitneyResult.zScore.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{mannWhitneyResult.pValue < 0.001 ? '< .001' : mannWhitneyResult.pValue.toFixed(4)}</td>
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
                        onClick={() => copyAPA(mannWhitneyResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{mannWhitneyResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select a metric dependent variable and a 2-group factor.</div>
              )}
            </>
          )}

          {/* TAB: WILCOXON SIGNED-RANK TEST */}
          {activeTab === 'wilcoxon' && (
            <>
              {wilcoxonResult ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Ranks Table</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Pair Comparison</th>
                            <th className="px-4 py-2.5 text-right">N</th>
                            <th className="px-4 py-2.5 text-right">Mean Rank</th>
                            <th className="px-4 py-2.5 text-right">Sum of Ranks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                              Negative Ranks ({wilcoxonResult.var2Name} &lt; {wilcoxonResult.var1Name})
                            </td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.negativeRanksN}</td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.negativeRanksMean.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.negativeRanksSum.toFixed(1)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                              Positive Ranks ({wilcoxonResult.var2Name} &gt; {wilcoxonResult.var1Name})
                            </td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.positiveRanksN}</td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.positiveRanksMean.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.positiveRanksSum.toFixed(1)}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                              Ties ({wilcoxonResult.var2Name} = {wilcoxonResult.var1Name})
                            </td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.tiesN}</td>
                            <td className="px-4 py-2.5 text-right">-</td>
                            <td className="px-4 py-2.5 text-right">-</td>
                          </tr>
                          <tr className="bg-slate-50 font-semibold">
                            <td className="px-4 py-2.5 font-sans text-slate-900">Total Valid Pairs</td>
                            <td className="px-4 py-2.5 text-right">{wilcoxonResult.n}</td>
                            <td className="px-4 py-2.5 text-right">-</td>
                            <td className="px-4 py-2.5 text-right">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Test Statistics</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Test Pair</th>
                            <th className="px-4 py-2 text-right">Z Statistic</th>
                            <th className="px-4 py-2 text-right">Asymp. Sig. (2-tailed)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{wilcoxonResult.var2Name} - {wilcoxonResult.var1Name}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-purple-600">{wilcoxonResult.zScore.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{wilcoxonResult.pValue < 0.001 ? '< .001' : wilcoxonResult.pValue.toFixed(4)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* APA Box */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>APA 7th Edition Statement</span>
                      </span>
                      <button
                        onClick={() => copyAPA(wilcoxonResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{wilcoxonResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select two continuous paired variables.</div>
              )}
            </>
          )}

          {/* TAB: KRUSKAL-WALLIS H TEST */}
          {activeTab === 'kruskal_wallis' && (
            <>
              {kruskalWallisResult ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Ranks Table</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5">Factor Level</th>
                            <th className="px-4 py-2.5 text-right">N</th>
                            <th className="px-4 py-2.5 text-right">Mean Rank</th>
                            <th className="px-4 py-2.5 text-right">Sum of Ranks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {kruskalWallisResult.groupStats.map((g) => (
                            <tr key={g.groupName} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{g.groupName}</td>
                              <td className="px-4 py-2.5 text-right">{g.n}</td>
                              <td className="px-4 py-2.5 text-right">{g.meanRank.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-right">{g.sumRanks.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Test Statistics</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                          <tr>
                            <th className="px-4 py-2">Kruskal-Wallis H (Chi-Square)</th>
                            <th className="px-4 py-2 text-right">df</th>
                            <th className="px-4 py-2 text-right">Asymp. Sig. (p-value)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-purple-600">{kruskalWallisResult.hStatistic.toFixed(3)}</td>
                            <td className="px-4 py-2.5 text-right">{kruskalWallisResult.df}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{kruskalWallisResult.pValue < 0.001 ? '< .001' : kruskalWallisResult.pValue.toFixed(4)}</td>
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
                        onClick={() => copyAPA(kruskalWallisResult.apaStatement)}
                        className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition"
                      >
                        {copiedAPA ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAPA ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      &ldquo;{kruskalWallisResult.apaStatement}&rdquo;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Select a metric dependent variable and a factor.</div>
              )}
            </>
          )}

          {/* TAB: INDEPENDENT T-TEST */}
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
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Group Statistics</h3>
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
                        <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Independent Samples Test (Welch&apos;s)</h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                              <tr>
                                <th className="px-4 py-2.5">Statistic</th>
                                <th className="px-4 py-2.5 text-right">t</th>
                                <th className="px-4 py-2.5 text-right">df</th>
                                <th className="px-4 py-2.5 text-right">p-value</th>
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

          {/* TAB: ONE-WAY ANOVA */}
          {activeTab === 'anova' && anovaResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">ANOVA Summary Table</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Source</th>
                        <th className="px-4 py-2.5 text-right">Sum of Squares</th>
                        <th className="px-4 py-2.5 text-right">df</th>
                        <th className="px-4 py-2.5 text-right">Mean Square</th>
                        <th className="px-4 py-2.5 text-right">F</th>
                        <th className="px-4 py-2.5 text-right">p-value</th>
                        <th className="px-4 py-2.5 text-right">η² (Eta Sq.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
                      <tr>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">Between Groups</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.ssBetween.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.dfBetween}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.msBetween.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">{anovaResult.fStatistic.toFixed(3)}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{anovaResult.pValue < 0.001 ? '< .001' : anovaResult.pValue.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.etaSquared.toFixed(3)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-sans text-slate-700">Within Groups</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.ssWithin.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.dfWithin}</td>
                        <td className="px-4 py-2.5 text-right">{anovaResult.msWithin.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {anovaResult.postHoc.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Tukey HSD Post-Hoc Comparisons</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <th className="px-4 py-2">Pairwise Comparison</th>
                          <th className="px-4 py-2 text-right">Mean Diff</th>
                          <th className="px-4 py-2 text-right">Adjusted p-value</th>
                          <th className="px-4 py-2 text-center">Significant</th>
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

          {/* TAB: PAIRED SAMPLES T-TEST */}
          {activeTab === 'paired_t' && pairedTResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Paired Samples Test</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2.5">Pair</th>
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
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{pairedTResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB: ONE-SAMPLE T-TEST */}
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
                <p className="font-serif italic text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  &ldquo;{oneSampleResult.apaStatement}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* TAB: CORRELATION MATRIX */}
          {activeTab === 'correlation' && correlationResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Correlation Matrix ({correlationResult.method === 'pearson' ? 'Pearson r' : 'Spearman ρ'})</h3>
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
              </div>
            </div>
          )}

          {/* TAB: CHI-SQUARE */}
          {activeTab === 'chisquare' && chiSquareResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Crosstabulation</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2">{chiSquareResult.rowVar}</th>
                        <th className="px-4 py-2">Count</th>
                        {chiSquareResult.colCategories.map((c) => (
                          <th key={c} className="px-4 py-2 text-right">{c}</th>
                        ))}
                        <th className="px-4 py-2 text-right bg-slate-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {chiSquareResult.rowCategories.map((r) => (
                        <tr key={r} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-sans font-medium text-slate-900 border-r border-slate-200">{r}</td>
                          <td className="px-4 py-1.5 font-sans text-slate-500">Observed</td>
                          {chiSquareResult.colCategories.map((c) => (
                            <td key={c} className="px-4 py-1.5 text-right font-bold text-slate-900">{chiSquareResult.observed[r][c]}</td>
                          ))}
                          <td className="px-4 py-1.5 text-right font-bold bg-slate-50">{chiSquareResult.rowTotals[r]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">Chi-Square Tests</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2">Test</th>
                        <th className="px-4 py-2 text-right">Value (χ²)</th>
                        <th className="px-4 py-2 text-right">df</th>
                        <th className="px-4 py-2 text-right">Asymp. Sig.</th>
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
            </div>
          )}

          {/* TAB: DESCRIPTIVES */}
          {activeTab === 'descriptives' && (
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Descriptive Statistics</h3>
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
