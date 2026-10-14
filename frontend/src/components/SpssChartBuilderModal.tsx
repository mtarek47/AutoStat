'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  Maximize2,
} from 'lucide-react';
import { Dataset } from '../types/dataset';

interface SpssChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  lang: 'en' | 'bn';
}

type ChartType = 'histogram' | 'boxplot' | 'scatterplot' | 'barchart';

export const SpssChartBuilderModal: React.FC<SpssChartBuilderModalProps> = ({
  isOpen,
  onClose,
  dataset,
  lang,
}) => {
  const [chartType, setChartType] = useState<ChartType>('histogram');
  const [copied, setCopied] = useState(false);

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

  // Variable selections
  const [selectedVarX, setSelectedVarX] = useState<string>(
    numericColumns[0]?.name || dataset.columns[0]?.name || ''
  );
  const [selectedVarY, setSelectedVarY] = useState<string>(
    numericColumns[1]?.name || numericColumns[0]?.name || ''
  );
  const [groupingVar, setGroupingVar] = useState<string>(
    categoricalColumns[0]?.name || ''
  );

  // Options
  const [showNormalCurve, setShowNormalCurve] = useState<boolean>(true);
  const [showFitLine, setShowFitLine] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- 1. HISTOGRAM CALCULATIONS ---
  const histogramData = useMemo(() => {
    if (!isOpen || chartType !== 'histogram' || !selectedVarX) return null;
    const values: number[] = [];
    dataset.rows.forEach((r) => {
      const v = parseFloat(r[selectedVarX]);
      if (!isNaN(v)) values.push(v);
    });
    if (values.length < 2) return null;

    const n = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);

    // Number of bins (Sturges formula)
    const numBins = Math.max(5, Math.min(15, Math.ceil(Math.log2(n) + 1)));
    const binWidth = (max - min) / numBins || 1;

    const bins = new Array(numBins).fill(0).map((_, i) => ({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      mid: min + (i + 0.5) * binWidth,
      count: 0,
    }));

    values.forEach((v) => {
      let bIdx = Math.floor((v - min) / binWidth);
      if (bIdx >= numBins) bIdx = numBins - 1;
      if (bIdx >= 0) bins[bIdx].count++;
    });

    const maxCount = Math.max(...bins.map((b) => b.count));

    return { n, min, max, mean, sd, bins, binWidth, maxCount };
  }, [isOpen, chartType, selectedVarX, dataset.rows]);

  // --- 2. SCATTERPLOT CALCULATIONS ---
  const scatterData = useMemo(() => {
    if (!isOpen || chartType !== 'scatterplot' || !selectedVarX || !selectedVarY) return null;
    const points: { x: number; y: number; id: number }[] = [];
    dataset.rows.forEach((r, idx) => {
      const vx = parseFloat(r[selectedVarX]);
      const vy = parseFloat(r[selectedVarY]);
      if (!isNaN(vx) && !isNaN(vy)) {
        points.push({ x: vx, y: vy, id: idx + 1 });
      }
    });
    if (points.length < 2) return null;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // OLS regression line
    const n = points.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    points.forEach((p) => {
      num += (p.x - meanX) * (p.y - meanY);
      den += Math.pow(p.x - meanX, 2);
    });
    const slope = den > 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;

    // R^2
    let ssTot = 0;
    let ssRes = 0;
    points.forEach((p) => {
      const pred = intercept + slope * p.x;
      ssTot += Math.pow(p.y - meanY, 2);
      ssRes += Math.pow(p.y - pred, 2);
    });
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    return { points, minX, maxX, minY, maxY, slope, intercept, r2 };
  }, [isOpen, chartType, selectedVarX, selectedVarY, dataset.rows]);

  // --- 3. BOXPLOT CALCULATIONS ---
  const boxplotData = useMemo(() => {
    if (!isOpen || chartType !== 'boxplot' || !selectedVarX) return null;

    const computeGroupStats = (vals: number[], name: string) => {
      if (vals.length < 3) return null;
      vals.sort((a, b) => a - b);
      const n = vals.length;
      const q2 = vals[Math.floor(n * 0.5)];
      const q1 = vals[Math.floor(n * 0.25)];
      const q3 = vals[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;

      const nonOutliers = vals.filter((v) => v >= lowerFence && v <= upperFence);
      const outliers = vals.filter((v) => v < lowerFence || v > upperFence);

      const whiskerLow = nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1;
      const whiskerHigh = nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3;

      return { name, q1, q2, q3, whiskerLow, whiskerHigh, outliers, n };
    };

    if (groupingVar) {
      // Grouped boxplots
      const groupsMap: Record<string, number[]> = {};
      dataset.rows.forEach((r) => {
        const g = String(r[groupingVar] ?? 'Unknown');
        const v = parseFloat(r[selectedVarX]);
        if (!isNaN(v)) {
          if (!groupsMap[g]) groupsMap[g] = [];
          groupsMap[g].push(v);
        }
      });
      const groups = Object.entries(groupsMap)
        .map(([gName, vals]) => computeGroupStats(vals, gName))
        .filter(Boolean) as any[];

      const allVals = dataset.rows
        .map((r) => parseFloat(r[selectedVarX]))
        .filter((v) => !isNaN(v));
      const min = Math.min(...allVals);
      const max = Math.max(...allVals);

      return { groups, min, max, isGrouped: true };
    } else {
      // Single boxplot
      const allVals = dataset.rows
        .map((r) => parseFloat(r[selectedVarX]))
        .filter((v) => !isNaN(v));
      const stat = computeGroupStats(allVals, selectedVarX);
      if (!stat) return null;
      return { groups: [stat], min: Math.min(...allVals), max: Math.max(...allVals), isGrouped: false };
    }
  }, [isOpen, chartType, selectedVarX, groupingVar, dataset.rows]);

  // Export SVG to PNG
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autostat_chart_${chartType}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    navigator.clipboard.writeText(svgData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dimensions
  const W = 620;
  const H = 360;
  const pad = { top: 30, right: 120, bottom: 50, left: 60 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
      <div className="bg-slate-100 border border-slate-300 rounded-lg shadow-2xl w-full max-w-4xl text-slate-800 text-xs overflow-hidden flex flex-col font-sans max-h-[92vh]">
        {/* Title Bar */}
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between font-semibold text-gray-800 select-none">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <span>{lang === 'bn' ? 'AutoStat চার্ট বিল্ডার (Chart Builder)' : 'AutoStat - Chart Builder'}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-4 flex gap-4 overflow-y-auto flex-1">
          {/* Left Panel: Chart Gallery & Variable Pickers */}
          <div className="w-64 flex flex-col space-y-3 bg-white border border-gray-200 p-3 rounded-lg shadow-2xs">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                {lang === 'bn' ? 'চার্টের ধরন (Gallery):' : 'Chart Gallery:'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setChartType('histogram')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold text-left transition flex items-center space-x-1.5 ${
                    chartType === 'histogram'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Histogram</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartType('scatterplot')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold text-left transition flex items-center space-x-1.5 ${
                    chartType === 'scatterplot'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Scatterplot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartType('boxplot')}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold text-left transition flex items-center space-x-1.5 ${
                    chartType === 'boxplot'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Boxplot</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-200 my-1" />

            {/* Variable Selectors */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  {chartType === 'scatterplot' ? 'X-Axis Variable:' : 'Variable:'}
                </label>
                <select
                  value={selectedVarX}
                  onChange={(e) => setSelectedVarX(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                >
                  {numericColumns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {chartType === 'scatterplot' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Y-Axis Variable:
                  </label>
                  <select
                    value={selectedVarY}
                    onChange={(e) => setSelectedVarY(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  >
                    {numericColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.label || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {chartType === 'boxplot' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Split by Factor (Optional):
                  </label>
                  <select
                    value={groupingVar}
                    onChange={(e) => setGroupingVar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="">-- None (Single Box) --</option>
                    {categoricalColumns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.label || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chart Options Checkboxes */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                {chartType === 'histogram' && (
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNormalCurve}
                      onChange={(e) => setShowNormalCurve(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Display Normal Curve</span>
                  </label>
                )}

                {chartType === 'scatterplot' && (
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFitLine}
                      onChange={(e) => setShowFitLine(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Add Linear Fit Line (OLS)</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Live SVG Chart Canvas */}
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                <span>AutoStat Graphics Canvas</span>
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={copySVG}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center space-x-1"
                  title="Copy SVG XML"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadSVG}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition flex items-center space-x-1 shadow-2xs"
                  title="Download SVG file"
                >
                  <Download className="w-3 h-3" />
                  <span>Download SVG</span>
                </button>
              </div>
            </div>

            {/* SVG RENDERING AREA */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 rounded border border-slate-200 p-2 overflow-hidden">
              {/* 1. HISTOGRAM */}
              {chartType === 'histogram' && histogramData && (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-full max-h-[360px]"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  {/* Background grid */}
                  <rect width={W} height={H} fill="#ffffff" />
                  <rect
                    x={pad.left}
                    y={pad.top}
                    width={innerW}
                    height={innerH}
                    fill="#fcfcfc"
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />

                  {/* Y-axis gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = pad.top + innerH * (1 - pct);
                    const countVal = Math.round(histogramData.maxCount * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={pad.left + innerW}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeDasharray="2,2"
                        />
                        <text
                          x={pad.left - 8}
                          y={y + 4}
                          fontSize="10"
                          textAnchor="end"
                          fill="#4b5563"
                        >
                          {countVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Histogram Bars */}
                  {histogramData.bins.map((b, idx) => {
                    const barW = innerW / histogramData.bins.length;
                    const barX = pad.left + idx * barW;
                    const barH = histogramData.maxCount > 0 ? (b.count / histogramData.maxCount) * innerH : 0;
                    const barY = pad.top + innerH - barH;
                    return (
                      <g key={idx}>
                        <rect
                          x={barX + 1}
                          y={barY}
                          width={Math.max(1, barW - 2)}
                          height={barH}
                          fill="#2563eb"
                          stroke="#1d4ed8"
                          strokeWidth="1"
                          opacity="0.85"
                        />
                        {/* X-axis tick labels */}
                        <text
                          x={barX + barW / 2}
                          y={pad.top + innerH + 16}
                          fontSize="9"
                          textAnchor="middle"
                          fill="#4b5563"
                        >
                          {b.mid.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Fitted Normal Bell Curve */}
                  {showNormalCurve && histogramData.sd > 0 && (
                    <path
                      d={(() => {
                        const pts: string[] = [];
                        const steps = 60;
                        const scaleFactor =
                          histogramData.n * histogramData.binWidth;
                        for (let s = 0; s <= steps; s++) {
                          const xVal =
                            histogramData.min +
                            (s / steps) * (histogramData.max - histogramData.min);
                          const svgX =
                            pad.left +
                            ((xVal - histogramData.min) /
                              (histogramData.max - histogramData.min)) *
                              innerW;
                          const z = (xVal - histogramData.mean) / histogramData.sd;
                          const density =
                            (1 / (histogramData.sd * Math.sqrt(2 * Math.PI))) *
                            Math.exp(-0.5 * z * z);
                          const expectedCount = density * scaleFactor;
                          const svgY =
                            pad.top +
                            innerH -
                            (expectedCount / histogramData.maxCount) * innerH;
                          pts.push(
                            `${s === 0 ? 'M' : 'L'} ${svgX.toFixed(1)} ${svgY.toFixed(
                              1
                            )}`
                          );
                        }
                        return pts.join(' ');
                      })()}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Axis Titles */}
                  <text
                    x={pad.left + innerW / 2}
                    y={H - 10}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1f2937"
                  >
                    {selectedVarX}
                  </text>
                  <text
                    x={15}
                    y={pad.top + innerH / 2}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1f2937"
                    transform={`rotate(-90, 15, ${pad.top + innerH / 2})`}
                  >
                    Frequency
                  </text>

                  {/* AutoStat Statistics Legend Box */}
                  <g transform={`translate(${W - pad.right + 10}, ${pad.top + 10})`}>
                    <rect
                      width="100"
                      height="65"
                      fill="#ffffff"
                      stroke="#9ca3af"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text x="8" y="16" fontSize="9" fontWeight="bold" fill="#111827">
                      Statistics
                    </text>
                    <text x="8" y="30" fontSize="9" fill="#374151">
                      Mean = {histogramData.mean.toFixed(2)}
                    </text>
                    <text x="8" y="44" fontSize="9" fill="#374151">
                      Std. Dev. = {histogramData.sd.toFixed(2)}
                    </text>
                    <text x="8" y="58" fontSize="9" fill="#374151">
                      N = {histogramData.n}
                    </text>
                  </g>
                </svg>
              )}

              {/* 2. SCATTERPLOT */}
              {chartType === 'scatterplot' && scatterData && (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-full max-h-[360px]"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <rect width={W} height={H} fill="#ffffff" />
                  <rect
                    x={pad.left}
                    y={pad.top}
                    width={innerW}
                    height={innerH}
                    fill="#fcfcfc"
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />

                  {/* Scatter Points */}
                  {scatterData.points.map((p, idx) => {
                    const rangeX = scatterData.maxX - scatterData.minX || 1;
                    const rangeY = scatterData.maxY - scatterData.minY || 1;
                    const cx = pad.left + ((p.x - scatterData.minX) / rangeX) * innerW;
                    const cy = pad.top + innerH - ((p.y - scatterData.minY) / rangeY) * innerH;
                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r="3.5"
                        fill="#3b82f6"
                        stroke="#1d4ed8"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    );
                  })}

                  {/* Fit Line */}
                  {showFitLine && (
                    <line
                      x1={pad.left}
                      y1={
                        pad.top +
                        innerH -
                        (((scatterData.intercept +
                          scatterData.slope * scatterData.minX) -
                          scatterData.minY) /
                          (scatterData.maxY - scatterData.minY || 1)) *
                          innerH
                      }
                      x2={pad.left + innerW}
                      y2={
                        pad.top +
                        innerH -
                        (((scatterData.intercept +
                          scatterData.slope * scatterData.maxX) -
                          scatterData.minY) /
                          (scatterData.maxY - scatterData.minY || 1)) *
                          innerH
                      }
                      stroke="#dc2626"
                      strokeWidth="2"
                    />
                  )}

                  {/* Axis Titles */}
                  <text
                    x={pad.left + innerW / 2}
                    y={H - 12}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1f2937"
                  >
                    {selectedVarX}
                  </text>
                  <text
                    x={15}
                    y={pad.top + innerH / 2}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1f2937"
                    transform={`rotate(-90, 15, ${pad.top + innerH / 2})`}
                  >
                    {selectedVarY}
                  </text>

                  {/* OLS Legend Box */}
                  {showFitLine && (
                    <g transform={`translate(${W - pad.right + 10}, ${pad.top + 10})`}>
                      <rect width="105" height="48" fill="#ffffff" stroke="#9ca3af" strokeWidth="1" rx="3" />
                      <text x="8" y="16" fontSize="9" fontWeight="bold" fill="#dc2626">Linear Fit</text>
                      <text x="8" y="30" fontSize="9" fill="#374151">R² Linear = {scatterData.r2.toFixed(3)}</text>
                    </g>
                  )}
                </svg>
              )}

              {/* 3. BOXPLOT */}
              {chartType === 'boxplot' && boxplotData && (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-full max-h-[360px]"
                  style={{ fontFamily: 'sans-serif' }}
                >
                  <rect width={W} height={H} fill="#ffffff" />
                  <rect
                    x={pad.left}
                    y={pad.top}
                    width={innerW}
                    height={innerH}
                    fill="#fcfcfc"
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />

                  {boxplotData.groups.map((g, idx) => {
                    const groupWidth = innerW / boxplotData.groups.length;
                    const centerX = pad.left + idx * groupWidth + groupWidth / 2;
                    const boxW = Math.min(60, groupWidth * 0.5);

                    const range = boxplotData.max - boxplotData.min || 1;
                    const scaleY = (val: number) =>
                      pad.top + innerH - ((val - boxplotData.min) / range) * innerH;

                    const yQ1 = scaleY(g.q1);
                    const yQ2 = scaleY(g.q2);
                    const yQ3 = scaleY(g.q3);
                    const yWhiskLow = scaleY(g.whiskerLow);
                    const yWhiskHigh = scaleY(g.whiskerHigh);

                    return (
                      <g key={idx}>
                        {/* Whiskers */}
                        <line x1={centerX} y1={yWhiskLow} x2={centerX} y2={yQ1} stroke="#1f2937" strokeWidth="1.5" />
                        <line x1={centerX - boxW / 4} y1={yWhiskLow} x2={centerX + boxW / 4} y2={yWhiskLow} stroke="#1f2937" strokeWidth="1.5" />
                        <line x1={centerX} y1={yWhiskHigh} x2={centerX} y2={yQ3} stroke="#1f2937" strokeWidth="1.5" />
                        <line x1={centerX - boxW / 4} y1={yWhiskHigh} x2={centerX + boxW / 4} y2={yWhiskHigh} stroke="#1f2937" strokeWidth="1.5" />

                        {/* Box */}
                        <rect
                          x={centerX - boxW / 2}
                          y={yQ3}
                          width={boxW}
                          height={Math.max(2, yQ1 - yQ3)}
                          fill="#bfdbfe"
                          stroke="#1e40af"
                          strokeWidth="1.5"
                        />

                        {/* Median line */}
                        <line
                          x1={centerX - boxW / 2}
                          y1={yQ2}
                          x2={centerX + boxW / 2}
                          y2={yQ2}
                          stroke="#1e3a8a"
                          strokeWidth="2.5"
                        />

                        {/* Group label */}
                        <text
                          x={centerX}
                          y={pad.top + innerH + 18}
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          fill="#374151"
                        >
                          {g.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Y-Axis Label */}
                  <text
                    x={15}
                    y={pad.top + innerH / 2}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#1f2937"
                    transform={`rotate(-90, 15, ${pad.top + innerH / 2})`}
                  >
                    {selectedVarX}
                  </text>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 border-t border-gray-300 px-4 py-2.5 flex items-center justify-end space-x-2 select-none">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-medium rounded shadow-2xs transition"
          >
            {lang === 'bn' ? 'বন্ধ করুন (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
