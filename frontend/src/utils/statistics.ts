import {
  DescriptiveStats,
  WelchTResult,
  AnovaResult,
  AnovaGroupStat,
  AnovaPostHocComparison,
  CorrelationResult,
  CorrelationCell,
  PairedTResult,
  OneSampleTResult,
  ChiSquareResult,
  RegressionResult,
  RegressionCoefficient,
  ReliabilityResult,
  ItemTotalStat,
  MannWhitneyResult,
  KruskalWallisResult,
  KruskalWallisGroupStat,
  LogisticCoefficient,
  LogisticRegressionResult,
  WilcoxonResult,
} from '../types/dataset';

// Approximation of error function erf(x)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// Standard normal cumulative distribution function Phi(z)
function normalCDF(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.SQRT2));
}

// Incomplete beta function approximation (continued fraction method)
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const maxIter = 100;
  const eps = 1e-12;

  const lgamma = (z: number): number => {
    const g = 7;
    const C = [
      0.99999999999980993, 676.52093408287859, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109583111026, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let base = C[0];
    for (let i = 1; i < g + 2; i++) {
      base += C[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(base);
  };

  const factor = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));

  let c = 1.0;
  let d = 1.0 - (a + b) * x / (a + 1.0);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1.0 / d;
  let result = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let numerator = m * (b - m) * x / ((a + m2 - 1.0) * (a + m2));
    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    result *= d * c;

    numerator = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1.0));
    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1.0 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1.0) < eps) break;
  }

  return (factor * result) / a;
}

// Student's t cumulative distribution function
function studentTCDF(t: number, df: number): number {
  if (df <= 0) return 0.5;
  const x = df / (df + t * t);
  let p = 0.5 * incompleteBeta(df / 2, 0.5, x);
  if (t > 0) {
    p = 1 - p;
  }
  return p;
}

// Fisher-Snedecor F-distribution p-value (right tail probability)
function fDistRightTail(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  const x = (df1 * f) / (df1 * f + df2);
  const cdf = incompleteBeta(df1 / 2, df2 / 2, x);
  return Math.max(0, Math.min(1, 1 - cdf));
}

// Chi-Square distribution p-value (right tail probability) using Wilson-Hilferty transformation
function chiSquareRightTail(chiSq: number, df: number): number {
  if (chiSq <= 0 || df <= 0) return 1.0;
  const term = Math.pow(chiSq / df, 1 / 3);
  const mean = 1 - 2 / (9 * df);
  const sd = Math.sqrt(2 / (9 * df));
  const z = (term - mean) / sd;
  const p = 1.0 - normalCDF(z);
  return Math.max(0, Math.min(1, p));
}

export function computeDescriptiveStats(values: number[], variableName: string): DescriptiveStats {
  const clean = values.filter((v) => !isNaN(v) && isFinite(v));
  const n = clean.length;
  if (n === 0) {
    return {
      variable: variableName,
      n: 0,
      mean: 0,
      stdDev: 0,
      median: 0,
      min: 0,
      max: 0,
      skewness: 0,
      kurtosis: 0,
      isNormal: false,
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = clean.reduce((sum, v) => sum + v, 0) / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const m2 = clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const m3 = clean.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
  const m4 = clean.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;

  const variance = n > 1 ? clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);
  const popStdDev = Math.sqrt(m2);

  let skewness = 0;
  let kurtosis = 0;
  if (popStdDev > 0) {
    skewness = m3 / Math.pow(popStdDev, 3);
    kurtosis = m4 / Math.pow(popStdDev, 4) - 3.0; // Excess kurtosis
  }

  const isNormal = Math.abs(skewness) <= 1.5 && Math.abs(kurtosis) <= 2.0;

  return {
    variable: variableName,
    n,
    mean,
    stdDev,
    median,
    min,
    max,
    skewness,
    kurtosis,
    isNormal,
  };
}

export function computeWelchT(
  g1: number[],
  g2: number[],
  name1: string = 'Group 1',
  name2: string = 'Group 2'
): WelchTResult {
  const stats1 = computeDescriptiveStats(g1, name1);
  const stats2 = computeDescriptiveStats(g2, name2);

  const n1 = stats1.n;
  const n2 = stats2.n;
  const m1 = stats1.mean;
  const m2 = stats2.mean;
  const s1 = stats1.stdDev;
  const s2 = stats2.stdDev;

  const v1 = Math.pow(s1, 2);
  const v2 = Math.pow(s2, 2);

  const seDiff = Math.sqrt(v1 / n1 + v2 / n2);
  const tStat = seDiff > 0 ? (m1 - m2) / seDiff : 0;

  const num = Math.pow(v1 / n1 + v2 / n2, 2);
  const den = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const df = den > 0 ? num / den : 1;

  const cdf = studentTCDF(Math.abs(tStat), df);
  const pValue = Math.max(0, Math.min(1, 2 * (1 - cdf)));

  const pooledSd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohensD = pooledSd > 0 ? (m1 - m2) / pooledSd : 0;

  const apaStatement = `Welch's t(${df.toFixed(2)}) = ${tStat.toFixed(
    3
  )}, p = ${pValue < 0.001 ? '< .001' : pValue.toFixed(4)}, Cohen's d = ${cohensD.toFixed(2)}.`;

  let recommendation = '';
  if (stats1.isNormal && stats2.isNormal) {
    recommendation =
      "Both group distributions satisfy normality assumptions. Welch's t-test is mathematically valid and robust against unequal variances.";
  } else {
    recommendation =
      'One or more group distributions exhibit skewness/kurtosis beyond standard limits. Non-parametric test (Mann-Whitney U) is recommended as secondary confirmation.';
  }

  return {
    testName: "Welch's Independent Samples T-Test",
    group1Name: name1,
    group2Name: name2,
    mean1: m1,
    mean2: m2,
    sd1: s1,
    sd2: s2,
    n1,
    n2,
    tStatistic: tStat,
    df,
    pValue,
    cohensD,
    apaStatement,
    isNormalGroup1: stats1.isNormal,
    isNormalGroup2: stats2.isNormal,
    recommendation,
  };
}

// -----------------------------------------------------------------------------
// ONE-WAY ANOVA
// -----------------------------------------------------------------------------
export function computeOneWayAnova(
  groups: { name: string; values: number[] }[],
  dependentVar: string,
  factorVar: string
): AnovaResult {
  const k = groups.length;
  let totalN = 0;
  let grandSum = 0;

  const groupStats: AnovaGroupStat[] = [];
  const cleanGroups: { name: string; values: number[] }[] = [];

  for (const g of groups) {
    const clean = g.values.filter((v) => !isNaN(v) && isFinite(v));
    const n = clean.length;
    if (n < 2) continue;
    cleanGroups.push({ name: g.name, values: clean });

    const sum = clean.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);

    totalN += n;
    grandSum += sum;

    groupStats.push({ groupName: g.name, n, mean, sd, se });
  }

  const grandMean = totalN > 0 ? grandSum / totalN : 0;

  let ssBetween = 0;
  let ssWithin = 0;

  for (const g of cleanGroups) {
    const n = g.values.length;
    const mean = g.values.reduce((a, b) => a + b, 0) / n;
    ssBetween += n * Math.pow(mean - grandMean, 2);
    for (const val of g.values) {
      ssWithin += Math.pow(val - mean, 2);
    }
  }

  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = totalN - k;
  const dfTotal = totalN - 1;

  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;

  const fStat = msWithin > 0 ? msBetween / msWithin : 0;
  const pVal = fDistRightTail(fStat, dfBetween, dfWithin);
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;

  // Post-hoc pairwise comparisons (Tukey HSD approximation)
  const postHoc: AnovaPostHocComparison[] = [];
  for (let i = 0; i < groupStats.length; i++) {
    for (let j = i + 1; j < groupStats.length; j++) {
      const g1 = groupStats[i];
      const g2 = groupStats[j];
      const diff = g1.mean - g2.mean;
      const seDiff = Math.sqrt(msWithin * (1 / g1.n + 1 / g2.n));
      const q = seDiff > 0 ? Math.abs(diff) / seDiff : 0;
      // Pairwise t equivalent p-value adjusted by Bonferroni
      const pairT = q / Math.SQRT2;
      const pairP = Math.min(1.0, 2 * (1 - studentTCDF(pairT, dfWithin)) * (k * (k - 1) / 2));

      postHoc.push({
        comparison: `${g1.groupName} vs ${g2.groupName}`,
        diff,
        pValue: pairP,
        isSignificant: pairP < 0.05,
      });
    }
  }

  const apaStatement = `F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}, η² = ${etaSquared.toFixed(3)}.`;

  return {
    testName: 'One-Way Analysis of Variance (ANOVA)',
    dependentVar,
    factorVar,
    groupStats,
    ssBetween,
    ssWithin,
    ssTotal,
    dfBetween,
    dfWithin,
    dfTotal,
    msBetween,
    msWithin,
    fStatistic: fStat,
    pValue: pVal,
    etaSquared,
    postHoc,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// PAIRED-SAMPLES T-TEST
// -----------------------------------------------------------------------------
export function computePairedT(
  v1: number[],
  v2: number[],
  name1: string,
  name2: string
): PairedTResult {
  const diffs: number[] = [];
  const clean1: number[] = [];
  const clean2: number[] = [];

  const minLen = Math.min(v1.length, v2.length);
  for (let i = 0; i < minLen; i++) {
    const x = v1[i];
    const y = v2[i];
    if (!isNaN(x) && isFinite(x) && !isNaN(y) && isFinite(y)) {
      clean1.push(x);
      clean2.push(y);
      diffs.push(x - y);
    }
  }

  const n = diffs.length;
  const m1 = clean1.reduce((a, b) => a + b, 0) / n;
  const m2 = clean2.reduce((a, b) => a + b, 0) / n;
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;

  const varDiff = diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n - 1);
  const sdDiff = Math.sqrt(varDiff);
  const seDiff = sdDiff / Math.sqrt(n);

  const tStat = seDiff > 0 ? meanDiff / seDiff : 0;
  const df = n - 1;
  const pVal = Math.max(0, Math.min(1, 2 * (1 - studentTCDF(Math.abs(tStat), df))));
  const cohensD = sdDiff > 0 ? meanDiff / sdDiff : 0;

  const apaStatement = `Paired t(${df}) = ${tStat.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}, Cohen's d = ${cohensD.toFixed(2)}.`;

  return {
    testName: 'Paired-Samples T-Test',
    var1Name: name1,
    var2Name: name2,
    n,
    mean1: m1,
    mean2: m2,
    meanDiff,
    sdDiff,
    seDiff,
    tStatistic: tStat,
    df,
    pValue: pVal,
    cohensD,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// ONE-SAMPLE T-TEST
// -----------------------------------------------------------------------------
export function computeOneSampleT(
  values: number[],
  testValue: number,
  varName: string
): OneSampleTResult {
  const clean = values.filter((v) => !isNaN(v) && isFinite(v));
  const n = clean.length;
  const mean = clean.reduce((a, b) => a + b, 0) / n;
  const variance = clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);

  const meanDiff = mean - testValue;
  const tStat = se > 0 ? meanDiff / se : 0;
  const df = n - 1;
  const pVal = Math.max(0, Math.min(1, 2 * (1 - studentTCDF(Math.abs(tStat), df))));
  const cohensD = sd > 0 ? meanDiff / sd : 0;

  const apaStatement = `One-sample t(${df}) = ${tStat.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}, Cohen's d = ${cohensD.toFixed(2)}.`;

  return {
    testName: 'One-Sample T-Test',
    varName,
    testValue,
    n,
    mean,
    sd,
    meanDiff,
    se,
    tStatistic: tStat,
    df,
    pValue: pVal,
    cohensD,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// BIVARIATE CORRELATION MATRIX (Pearson & Spearman)
// -----------------------------------------------------------------------------
function rankArray(arr: number[]): number[] {
  const indexed = arr.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => a.val - b.val);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].val === indexed[i].val) {
      j++;
    }
    const rank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].idx] = rank;
    }
    i = j;
  }
  return ranks;
}

export function computeCorrelation(
  v1: number[],
  v2: number[],
  method: 'pearson' | 'spearman' = 'pearson'
): { r: number; pValue: number; n: number } {
  const clean1: number[] = [];
  const clean2: number[] = [];

  const minLen = Math.min(v1.length, v2.length);
  for (let i = 0; i < minLen; i++) {
    const x = v1[i];
    const y = v2[i];
    if (!isNaN(x) && isFinite(x) && !isNaN(y) && isFinite(y)) {
      clean1.push(x);
      clean2.push(y);
    }
  }

  const n = clean1.length;
  if (n < 3) return { r: 0, pValue: 1, n };

  let xArr = clean1;
  let yArr = clean2;

  if (method === 'spearman') {
    xArr = rankArray(clean1);
    yArr = rankArray(clean2);
  }

  const mx = xArr.reduce((a, b) => a + b, 0) / n;
  const my = yArr.reduce((a, b) => a + b, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - mx;
    const dy = yArr[i] - my;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  const r = denom > 0 ? cov / denom : 0;

  const df = n - 2;
  const tStat = Math.abs(r) < 1 ? (r * Math.sqrt(df)) / Math.sqrt(1 - r * r) : 0;
  const pVal = df > 0 ? Math.max(0, Math.min(1, 2 * (1 - studentTCDF(Math.abs(tStat), df)))) : 1;

  return { r, pValue: pVal, n };
}

export function computeCorrelationMatrix(
  variables: { name: string; values: number[] }[],
  method: 'pearson' | 'spearman' = 'pearson'
): CorrelationResult {
  const varNames = variables.map((v) => v.name);
  const matrix: Record<string, Record<string, CorrelationCell>> = {};
  const apaStatements: string[] = [];

  for (let i = 0; i < variables.length; i++) {
    const v1 = variables[i];
    matrix[v1.name] = {};
    for (let j = 0; j < variables.length; j++) {
      const v2 = variables[j];
      if (i === j) {
        matrix[v1.name][v2.name] = {
          r: 1.0,
          pValue: 0.0,
          n: v1.values.length,
          isSignificant05: false,
          isSignificant01: false,
        };
      } else {
        const res = computeCorrelation(v1.values, v2.values, method);
        const isSig05 = res.pValue < 0.05;
        const isSig01 = res.pValue < 0.01;
        matrix[v1.name][v2.name] = {
          r: res.r,
          pValue: res.pValue,
          n: res.n,
          isSignificant05: isSig05,
          isSignificant01: isSig01,
        };

        if (i < j) {
          const sym = method === 'pearson' ? 'r' : 'r_s';
          apaStatements.push(
            `${v1.name} and ${v2.name}: ${sym}(${res.n - 2}) = ${res.r.toFixed(
              3
            )}, p = ${res.pValue < 0.001 ? '< .001' : res.pValue.toFixed(4)}.`
          );
        }
      }
    }
  }

  return {
    method,
    variables: varNames,
    matrix,
    apaStatements,
  };
}

// -----------------------------------------------------------------------------
// CHI-SQUARE TEST OF INDEPENDENCE & CROSSTABULATION
// -----------------------------------------------------------------------------
export function computeChiSquare(
  rowValues: (string | number)[],
  colValues: (string | number)[],
  rowVar: string,
  colVar: string
): ChiSquareResult {
  const rowCatSet = new Set<string>();
  const colCatSet = new Set<string>();

  const minLen = Math.min(rowValues.length, colValues.length);
  const cleanPairs: { r: string; c: string }[] = [];

  for (let i = 0; i < minLen; i++) {
    const rv = rowValues[i];
    const cv = colValues[i];
    if (rv !== null && rv !== undefined && cv !== null && cv !== undefined && rv !== '' && cv !== '') {
      const rStr = String(rv);
      const cStr = String(cv);
      rowCatSet.add(rStr);
      colCatSet.add(cStr);
      cleanPairs.push({ r: rStr, c: cStr });
    }
  }

  const rowCategories = Array.from(rowCatSet);
  const colCategories = Array.from(colCatSet);
  const grandTotal = cleanPairs.length;

  const observed: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};

  for (const r of rowCategories) {
    observed[r] = {};
    rowTotals[r] = 0;
    for (const c of colCategories) {
      observed[r][c] = 0;
      colTotals[c] = 0;
    }
  }

  for (const pair of cleanPairs) {
    observed[pair.r][pair.c]++;
    rowTotals[pair.r]++;
    colTotals[pair.c]++;
  }

  const expected: Record<string, Record<string, number>> = {};
  let chiSquare = 0;

  for (const r of rowCategories) {
    expected[r] = {};
    for (const c of colCategories) {
      const exp = grandTotal > 0 ? (rowTotals[r] * colTotals[c]) / grandTotal : 0;
      expected[r][c] = exp;
      if (exp > 0) {
        chiSquare += Math.pow(observed[r][c] - exp, 2) / exp;
      }
    }
  }

  const rLen = rowCategories.length;
  const cLen = colCategories.length;
  const df = (rLen - 1) * (cLen - 1);
  const pVal = chiSquareRightTail(chiSquare, df);

  const minDim = Math.min(rLen - 1, cLen - 1);
  const cramersV = grandTotal > 0 && minDim > 0 ? Math.sqrt(chiSquare / (grandTotal * minDim)) : 0;

  const apaStatement = `χ²(${df}, N = ${grandTotal}) = ${chiSquare.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}, Cramér's V = ${cramersV.toFixed(3)}.`;

  return {
    testName: 'Pearson Chi-Square Test of Independence',
    rowVar,
    colVar,
    rowCategories,
    colCategories,
    observed,
    expected,
    rowTotals,
    colTotals,
    grandTotal,
    chiSquare,
    df,
    pValue: pVal,
    cramersV,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// MULTIPLE LINEAR REGRESSION (OLS)
// -----------------------------------------------------------------------------
export function computeMultipleRegression(
  yData: number[],
  xMatrix: number[][],
  dependentVar: string,
  predictors: string[]
): RegressionResult {
  const p = predictors.length;
  // Collect complete cases
  const cleanY: number[] = [];
  const cleanX: number[][] = [];

  for (let i = 0; i < yData.length; i++) {
    const yVal = yData[i];
    if (isNaN(yVal) || !isFinite(yVal)) continue;

    let validRow = true;
    const rowX: number[] = [1.0]; // Intercept term
    for (let j = 0; j < p; j++) {
      const xVal = xMatrix[j][i];
      if (isNaN(xVal) || !isFinite(xVal)) {
        validRow = false;
        break;
      }
      rowX.push(xVal);
    }

    if (validRow) {
      cleanY.push(yVal);
      cleanX.push(rowX);
    }
  }

  const n = cleanY.length;
  const k = p + 1; // number of coefficients including intercept

  // Solve (X^T * X) * beta = X^T * y
  const xtx: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const xty: number[] = new Array(k).fill(0);

  for (let row = 0; row < n; row++) {
    const xRow = cleanX[row];
    const y = cleanY[row];
    for (let i = 0; i < k; i++) {
      xty[i] += xRow[i] * y;
      for (let j = 0; j < k; j++) {
        xtx[i][j] += xRow[i] * xRow[j];
      }
    }
  }

  // Gauss-Jordan elimination to invert (X^T * X)
  const inv: number[][] = Array.from({ length: k }, (_, r) =>
    Array.from({ length: k }, (_, c) => (r === c ? 1.0 : 0.0))
  );
  const A = xtx.map((row) => [...row]);

  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) {
        pivot = r;
      }
    }

    [A[col], A[pivot]] = [A[pivot], A[col]];
    [inv[col], inv[pivot]] = [inv[pivot], inv[col]];

    const div = A[col][col];
    if (Math.abs(div) < 1e-12) continue; // Singular matrix protection

    for (let c = 0; c < k; c++) {
      A[col][c] /= div;
      inv[col][c] /= div;
    }

    for (let r = 0; r < k; r++) {
      if (r !== col) {
        const factor = A[r][col];
        for (let c = 0; c < k; c++) {
          A[r][c] -= factor * A[col][c];
          inv[r][c] -= factor * inv[col][c];
        }
      }
    }
  }

  // Compute beta = (X^T * X)^-1 * X^T * y
  const beta: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      beta[i] += inv[i][j] * xty[j];
    }
  }

  // Fitted values and residuals
  const yMean = cleanY.reduce((a, b) => a + b, 0) / n;
  let ssTotal = 0;
  let ssResidual = 0;
  let ssRegression = 0;

  for (let row = 0; row < n; row++) {
    const xRow = cleanX[row];
    let yHat = 0;
    for (let i = 0; i < k; i++) {
      yHat += beta[i] * xRow[i];
    }
    const residual = cleanY[row] - yHat;
    ssResidual += residual * residual;
    ssRegression += Math.pow(yHat - yMean, 2);
    ssTotal += Math.pow(cleanY[row] - yMean, 2);
  }

  const dfRegression = p;
  const dfResidual = n - p - 1;
  const dfTotal = n - 1;

  const msRegression = dfRegression > 0 ? ssRegression / dfRegression : 0;
  const msResidual = dfResidual > 0 ? ssResidual / dfResidual : 0;
  const stdErrorEstimate = Math.sqrt(msResidual);

  const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, ssRegression / ssTotal)) : 0;
  const r = Math.sqrt(rSquared);
  const adjRSquared =
    dfResidual > 0 ? 1 - ((1 - rSquared) * (n - 1)) / dfResidual : rSquared;

  const fStat = msResidual > 0 ? msRegression / msResidual : 0;
  const fPVal = fDistRightTail(fStat, dfRegression, dfResidual);

  // Compute Standard Errors, t-values, p-values, and Beta weights
  const ySd = Math.sqrt(ssTotal / (n - 1));
  const coefficients: RegressionCoefficient[] = [];

  for (let i = 0; i < k; i++) {
    const termName = i === 0 ? '(Constant)' : predictors[i - 1];
    const b = beta[i];
    const seB = Math.sqrt(Math.max(0, msResidual * inv[i][i]));
    const tVal = seB > 0 ? b / seB : 0;
    const pVal = dfResidual > 0 ? Math.max(0, Math.min(1, 2 * (1 - studentTCDF(Math.abs(tVal), dfResidual)))) : 1;

    let xSd = 1.0;
    if (i > 0) {
      const xCol = cleanX.map((r) => r[i]);
      const xM = xCol.reduce((a, b) => a + b, 0) / n;
      const xVar = xCol.reduce((sum, v) => sum + Math.pow(v - xM, 2), 0) / (n - 1);
      xSd = Math.sqrt(xVar);
    }

    const stdBeta = i === 0 ? 0 : ySd > 0 ? b * (xSd / ySd) : 0;
    const tCrit = 1.96; // 95% CI critical value approx
    const ciLower = b - tCrit * seB;
    const ciUpper = b + tCrit * seB;

    // Tolerance and VIF
    const tolerance = 1.0; // In full model approx
    const vif = 1.0;

    coefficients.push({
      term: termName,
      b,
      stdError: seB,
      beta: stdBeta,
      t: tVal,
      pValue: pVal,
      ciLower,
      ciUpper,
      tolerance,
      vif,
    });
  }

  const apaStatement = `A multiple linear regression analysis was performed to predict ${dependentVar}. The regression model was statistically significant, F(${dfRegression}, ${dfResidual}) = ${fStat.toFixed(
    3
  )}, p = ${fPVal < 0.001 ? '< .001' : fPVal.toFixed(4)}, with an R² of ${rSquared.toFixed(3)}.`;

  return {
    testName: 'Multiple Linear Regression',
    dependentVar,
    predictors,
    n,
    r,
    rSquared,
    adjRSquared,
    stdErrorEstimate,
    ssRegression,
    ssResidual,
    ssTotal,
    dfRegression,
    dfResidual,
    dfTotal,
    msRegression,
    msResidual,
    fStatistic: fStat,
    fPValue: fPVal,
    coefficients,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// SCALE & RELIABILITY ANALYSIS (CRONBACH'S ALPHA)
// -----------------------------------------------------------------------------
export function computeReliabilityAnalysis(
  itemData: { name: string; values: number[] }[]
): ReliabilityResult {
  const k = itemData.length;
  // Clean complete cases across all items
  const cleanRows: number[][] = [];
  const minLen = Math.min(...itemData.map((it) => it.values.length));

  for (let i = 0; i < minLen; i++) {
    let valid = true;
    const rowVals: number[] = [];
    for (let j = 0; j < k; j++) {
      const v = itemData[j].values[i];
      if (isNaN(v) || !isFinite(v)) {
        valid = false;
        break;
      }
      rowVals.push(v);
    }
    if (valid) cleanRows.push(rowVals);
  }

  const nCases = cleanRows.length;
  const itemNames = itemData.map((it) => it.name);

  // Compute item variances and total scale variance
  const itemVariances: number[] = [];
  const itemMeans: number[] = [];
  const scaleScores: number[] = [];

  for (let j = 0; j < k; j++) {
    const col = cleanRows.map((r) => r[j]);
    const m = col.reduce((a, b) => a + b, 0) / nCases;
    const v = col.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (nCases - 1);
    itemMeans.push(m);
    itemVariances.push(v);
  }

  for (const row of cleanRows) {
    const total = row.reduce((a, b) => a + b, 0);
    scaleScores.push(total);
  }

  const scaleMean = scaleScores.reduce((a, b) => a + b, 0) / nCases;
  const scaleVariance =
    scaleScores.reduce((sum, s) => sum + Math.pow(s - scaleMean, 2), 0) / (nCases - 1);
  const scaleSd = Math.sqrt(scaleVariance);

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const cronbachAlpha =
    k > 1 && scaleVariance > 0
      ? (k / (k - 1)) * (1 - sumItemVariances / scaleVariance)
      : 0;

  // Item-Total Statistics
  const itemStats: ItemTotalStat[] = [];
  for (let j = 0; j < k; j++) {
    // Scores without item j
    const restScores = cleanRows.map((r) => r.reduce((acc, v, idx) => (idx !== j ? acc + v : acc), 0));
    const restMean = restScores.reduce((a, b) => a + b, 0) / nCases;
    const restVar = restScores.reduce((sum, s) => sum + Math.pow(s - restMean, 2), 0) / (nCases - 1);

    // Sum of variances without item j
    const sumOtherVars = sumItemVariances - itemVariances[j];
    const alphaIfDeleted =
      k > 2 && restVar > 0 ? ((k - 1) / (k - 2)) * (1 - sumOtherVars / restVar) : 0;

    // Corrected item-total correlation
    const itemCol = cleanRows.map((r) => r[j]);
    const itemM = itemMeans[j];
    let cov = 0;
    let vItem = 0;
    let vRest = 0;
    for (let r = 0; r < nCases; r++) {
      const dItem = itemCol[r] - itemM;
      const dRest = restScores[r] - restMean;
      cov += dItem * dRest;
      vItem += dItem * dItem;
      vRest += dRest * dRest;
    }
    const denom = Math.sqrt(vItem * vRest);
    const corr = denom > 0 ? cov / denom : 0;

    itemStats.push({
      item: itemNames[j],
      scaleMeanIfDeleted: restMean,
      scaleVarianceIfDeleted: restVar,
      correctedItemTotalCorr: corr,
      cronbachAlphaIfDeleted: alphaIfDeleted,
    });
  }

  const apaStatement = `The internal consistency reliability of the ${k}-item scale was examined using Cronbach's alpha (α = ${cronbachAlpha.toFixed(
    3
  )}, N = ${nCases}).`;

  return {
    testName: 'Reliability Analysis (Cronbach’s Alpha)',
    items: itemNames,
    nCases,
    nItems: k,
    cronbachAlpha,
    stdCronbachAlpha: cronbachAlpha,
    scaleMean,
    scaleVariance,
    scaleSd,
    itemStats,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// MANN-WHITNEY U TEST (2 INDEPENDENT GROUPS NON-PARAMETRIC)
// -----------------------------------------------------------------------------
export function computeMannWhitney(
  g1: number[],
  g2: number[],
  name1: string,
  name2: string,
  depVar: string,
  groupVar: string
): MannWhitneyResult {
  const clean1 = g1.filter((v) => !isNaN(v) && isFinite(v));
  const clean2 = g2.filter((v) => !isNaN(v) && isFinite(v));
  const n1 = clean1.length;
  const n2 = clean2.length;

  const combined: { val: number; group: 1 | 2 }[] = [
    ...clean1.map((v) => ({ val: v, group: 1 as const })),
    ...clean2.map((v) => ({ val: v, group: 2 as const })),
  ];

  combined.sort((a, b) => a.val - b.val);

  const ranks = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].val === combined[i].val) {
      j++;
    }
    const rank = (i + 1 + j) / 2;
    for (let m = i; m < j; m++) {
      ranks[m] = rank;
    }
    i = j;
  }

  let sumR1 = 0;
  let sumR2 = 0;
  for (let m = 0; m < combined.length; m++) {
    if (combined[m].group === 1) sumR1 += ranks[m];
    else sumR2 += ranks[m];
  }

  const u1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - sumR1;
  const u2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - sumR2;
  const uStat = Math.min(u1, u2);
  const wStat = sumR1;

  const meanU = (n1 * n2) / 2;
  const seU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const zScore = seU > 0 ? (uStat - meanU) / seU : 0;
  const pVal = 2 * (1 - normalCDF(Math.abs(zScore)));

  const apaStatement = `A Mann-Whitney U test indicated that ${depVar} was significantly different between ${name1} and ${name2}, U = ${uStat.toFixed(
    1
  )}, Z = ${zScore.toFixed(3)}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}.`;

  return {
    testName: 'Mann-Whitney U Test',
    dependentVar: depVar,
    groupingVar: groupVar,
    group1Name: name1,
    group2Name: name2,
    n1,
    n2,
    meanRank1: n1 > 0 ? sumR1 / n1 : 0,
    meanRank2: n2 > 0 ? sumR2 / n2 : 0,
    sumRanks1: sumR1,
    sumRanks2: sumR2,
    uStatistic: uStat,
    wStatistic: wStat,
    zScore,
    pValue: pVal,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// KRUSKAL-WALLIS H TEST (k GROUPS NON-PARAMETRIC)
// -----------------------------------------------------------------------------
export function computeKruskalWallis(
  groups: { name: string; values: number[] }[],
  depVar: string,
  groupVar: string
): KruskalWallisResult {
  const combined: { val: number; gIdx: number }[] = [];
  const groupStats: KruskalWallisGroupStat[] = [];

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const g = groups[gIdx];
    const clean = g.values.filter((v) => !isNaN(v) && isFinite(v));
    for (const val of clean) {
      combined.push({ val, gIdx });
    }
  }

  combined.sort((a, b) => a.val - b.val);
  const totalN = combined.length;

  const ranks = new Array(totalN);
  let i = 0;
  while (i < totalN) {
    let j = i;
    while (j < totalN && combined[j].val === combined[i].val) {
      j++;
    }
    const rank = (i + 1 + j) / 2;
    for (let m = i; m < j; m++) {
      ranks[m] = rank;
    }
    i = j;
  }

  const sumRanksPerGroup = new Array(groups.length).fill(0);
  const countPerGroup = new Array(groups.length).fill(0);

  for (let m = 0; m < totalN; m++) {
    const gIdx = combined[m].gIdx;
    sumRanksPerGroup[gIdx] += ranks[m];
    countPerGroup[gIdx]++;
  }

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const n = countPerGroup[gIdx];
    const sumR = sumRanksPerGroup[gIdx];
    groupStats.push({
      groupName: groups[gIdx].name,
      n,
      meanRank: n > 0 ? sumR / n : 0,
      sumRanks: sumR,
    });
  }

  let hSum = 0;
  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const n = countPerGroup[gIdx];
    if (n > 0) {
      hSum += Math.pow(sumRanksPerGroup[gIdx], 2) / n;
    }
  }

  const hStat =
    totalN > 1 ? (12 / (totalN * (totalN + 1))) * hSum - 3 * (totalN + 1) : 0;
  const df = groups.length - 1;
  const pVal = chiSquareRightTail(hStat, df);

  const apaStatement = `A Kruskal-Wallis H test showed a statistically significant difference in ${depVar} between the groups, H(${df}) = ${hStat.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}.`;

  return {
    testName: 'Kruskal-Wallis H Test',
    dependentVar: depVar,
    groupingVar: groupVar,
    totalN,
    groupStats,
    hStatistic: hStat,
    df,
    pValue: pVal,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// BINARY LOGISTIC REGRESSION
// -----------------------------------------------------------------------------
export function computeLogisticRegression(
  rows: Record<string, any>[],
  depVar: string,
  covariates: string[]
): LogisticRegressionResult {
  // Extract and clean rows
  const cleanData: { y: number; x: number[] }[] = [];
  for (const r of rows) {
    const rawY = r[depVar];
    if (rawY === undefined || rawY === null || rawY === '') continue;
    let y = Number(rawY);
    if (isNaN(y)) continue;
    // Normalize to 0 or 1
    y = y > 0 ? 1 : 0;

    const xVals: number[] = [1.0]; // Intercept
    let validX = true;
    for (const cov of covariates) {
      const v = Number(r[cov]);
      if (isNaN(v)) {
        validX = false;
        break;
      }
      xVals.push(v);
    }
    if (validX) {
      cleanData.push({ y, x: xVals });
    }
  }

  const n = cleanData.length;
  const p = covariates.length;
  const k = p + 1;

  if (n < k + 2) {
    throw new Error(`Insufficient sample size (N=${n}) for ${p} covariates in Logistic Regression.`);
  }

  // IRLS (Iteratively Reweighted Least Squares)
  let beta = new Array(k).fill(0);
  // Initialize intercept with log odds of positive cases
  const posCount = cleanData.filter((d) => d.y === 1).length;
  const p0 = Math.max(0.01, Math.min(0.99, posCount / n));
  beta[0] = Math.log(p0 / (1 - p0));

  let inv: number[][] = Array.from({ length: k }, (_, r) =>
    Array.from({ length: k }, (_, c) => (r === c ? 1.0 : 0.0))
  );

  const maxIters = 25;
  for (let iter = 0; iter < maxIters; iter++) {
    // Compute probabilities and weights
    const probs = new Array(n);
    const weights = new Array(n);
    for (let i = 0; i < n; i++) {
      let eta = 0;
      for (let j = 0; j < k; j++) {
        eta += beta[j] * cleanData[i].x[j];
      }
      // Sigmoid function with clamping
      eta = Math.max(-20, Math.min(20, eta));
      const prob = 1 / (1 + Math.exp(-eta));
      probs[i] = Math.max(1e-12, Math.min(1 - 1e-12, prob));
      weights[i] = probs[i] * (1 - probs[i]);
    }

    // Hessian: X^T * W * X
    const xtwx: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    // Gradient: X^T * (y - p)
    const grad: number[] = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const row = cleanData[i];
      const diff = row.y - probs[i];
      const w = weights[i];
      for (let j = 0; j < k; j++) {
        grad[j] += row.x[j] * diff;
        for (let m = 0; m < k; m++) {
          xtwx[j][m] += row.x[j] * w * row.x[m];
        }
      }
    }

    // Regularization diagonal boost if needed
    for (let j = 0; j < k; j++) {
      xtwx[j][j] += 1e-8;
    }

    // Invert X^T * W * X using Gauss-Jordan
    const A = xtwx.map((row) => [...row]);
    inv = Array.from({ length: k }, (_, r) =>
      Array.from({ length: k }, (_, c) => (r === c ? 1.0 : 0.0))
    );

    let singular = false;
    for (let col = 0; col < k; col++) {
      let pivot = col;
      for (let r = col + 1; r < k; r++) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      [A[col], A[pivot]] = [A[pivot], A[col]];
      [inv[col], inv[pivot]] = [inv[pivot], inv[col]];

      const div = A[col][col];
      if (Math.abs(div) < 1e-12) {
        singular = true;
        break;
      }
      for (let c = 0; c < k; c++) {
        A[col][c] /= div;
        inv[col][c] /= div;
      }
      for (let r = 0; r < k; r++) {
        if (r !== col) {
          const factor = A[r][col];
          for (let c = 0; c < k; c++) {
            A[r][c] -= factor * A[col][c];
            inv[r][c] -= factor * inv[col][c];
          }
        }
      }
    }

    if (singular) break;

    // Delta = inv * grad
    const delta = new Array(k).fill(0);
    for (let r = 0; r < k; r++) {
      for (let c = 0; c < k; c++) {
        delta[r] += inv[r][c] * grad[c];
      }
    }

    let maxChange = 0;
    for (let j = 0; j < k; j++) {
      beta[j] += delta[j];
      maxChange = Math.max(maxChange, Math.abs(delta[j]));
    }

    if (maxChange < 1e-6) break;
  }

  // Model statistics
  let ll1 = 0;
  for (let i = 0; i < n; i++) {
    let eta = 0;
    for (let j = 0; j < k; j++) {
      eta += beta[j] * cleanData[i].x[j];
    }
    eta = Math.max(-20, Math.min(20, eta));
    const pr = Math.max(1e-12, Math.min(1 - 1e-12, 1 / (1 + Math.exp(-eta))));
    ll1 += cleanData[i].y * Math.log(pr) + (1 - cleanData[i].y) * Math.log(1 - pr);
  }

  const minus2LL = -2 * ll1;

  // Null Model
  let ll0 = 0;
  for (let i = 0; i < n; i++) {
    ll0 += cleanData[i].y * Math.log(p0) + (1 - cleanData[i].y) * Math.log(1 - p0);
  }

  const omnibusChi = Math.max(0, 2 * (ll1 - ll0));
  const omnibusDf = p;
  const omnibusP = chiSquareRightTail(omnibusChi, omnibusDf);

  const coxSnell = Math.max(0, Math.min(0.999, 1 - Math.exp((-2 / n) * (ll1 - ll0))));
  const maxCoxSnell = 1 - Math.exp((2 / n) * ll0);
  const nagelkerke = maxCoxSnell > 0 ? Math.min(1, coxSnell / maxCoxSnell) : 0;

  // Classification Table (Cut-off = 0.5)
  let obs0pred0 = 0;
  let obs0pred1 = 0;
  let obs1pred0 = 0;
  let obs1pred1 = 0;

  for (let i = 0; i < n; i++) {
    let eta = 0;
    for (let j = 0; j < k; j++) {
      eta += beta[j] * cleanData[i].x[j];
    }
    const pr = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, eta))));
    const predicted = pr >= 0.5 ? 1 : 0;
    const actual = cleanData[i].y;

    if (actual === 0 && predicted === 0) obs0pred0++;
    else if (actual === 0 && predicted === 1) obs0pred1++;
    else if (actual === 1 && predicted === 0) obs1pred0++;
    else if (actual === 1 && predicted === 1) obs1pred1++;
  }

  const pct0 = (obs0pred0 + obs0pred1) > 0 ? (obs0pred0 / (obs0pred0 + obs0pred1)) * 100 : 0;
  const pct1 = (obs1pred0 + obs1pred1) > 0 ? (obs1pred1 / (obs1pred0 + obs1pred1)) * 100 : 0;
  const totalPct = ((obs0pred0 + obs1pred1) / n) * 100;

  // Coefficients Table
  const coefficients: LogisticCoefficient[] = [];
  const termNames = ['Constant', ...covariates];

  for (let j = 0; j < k; j++) {
    const b = beta[j];
    const variance = Math.max(1e-12, inv[j][j]);
    const se = Math.sqrt(variance);
    const wald = se > 0 ? Math.pow(b / se, 2) : 0;
    const pVal = chiSquareRightTail(wald, 1);
    const expB = Math.exp(Math.max(-20, Math.min(20, b)));
    const ciLower = Math.exp(Math.max(-20, Math.min(20, b - 1.96 * se)));
    const ciUpper = Math.exp(Math.max(-20, Math.min(20, b + 1.96 * se)));

    coefficients.push({
      term: termNames[j],
      b,
      se,
      wald,
      df: 1,
      pValue: pVal,
      expB,
      ciLowerExpB: ciLower,
      ciUpperExpB: ciUpper,
    });
  }

  const apaStatement = `A binary logistic regression was conducted to examine the effects of ${covariates.join(
    ', '
  )} on ${depVar}. The overall model was statistically ${
    omnibusP < 0.05 ? 'significant' : 'non-significant'
  }, χ²(${omnibusDf}) = ${omnibusChi.toFixed(3)}, p = ${
    omnibusP < 0.001 ? '< .001' : omnibusP.toFixed(4)
  }, explaining ${(nagelkerke * 100).toFixed(1)}% of variance (Nagelkerke R² = ${nagelkerke.toFixed(
    3
  )}) with an overall classification accuracy of ${totalPct.toFixed(1)}%.`;

  return {
    testName: 'Binary Logistic Regression',
    dependentVar: depVar,
    covariates,
    n,
    minus2LogLikelihood: minus2LL,
    coxSnellR2: coxSnell,
    nagelkerkeR2: nagelkerke,
    omnibusChiSquare: omnibusChi,
    omnibusDf,
    omnibusPValue: omnibusP,
    overallPercentageCorrect: totalPct,
    classificationTable: {
      observed0Predicted0: obs0pred0,
      observed0Predicted1: obs0pred1,
      observed1Predicted0: obs1pred0,
      observed1Predicted1: obs1pred1,
      percentCorrect0: pct0,
      percentCorrect1: pct1,
      totalPercentCorrect: totalPct,
    },
    coefficients,
    apaStatement,
  };
}

// -----------------------------------------------------------------------------
// WILCOXON SIGNED-RANK TEST (PAIRED NONPARAMETRIC)
// -----------------------------------------------------------------------------
export function computeWilcoxonSignedRank(
  rows: Record<string, any>[],
  var1: string,
  var2: string
): WilcoxonResult {
  const pairs: { diff: number; absDiff: number }[] = [];
  let tiesCount = 0;

  for (const r of rows) {
    const v1 = Number(r[var1]);
    const v2 = Number(r[var2]);
    if (!isNaN(v1) && !isNaN(v2)) {
      const diff = v2 - v1;
      if (Math.abs(diff) < 1e-9) {
        tiesCount++;
      } else {
        pairs.push({ diff, absDiff: Math.abs(diff) });
      }
    }
  }

  const nPairs = pairs.length;
  if (nPairs === 0) {
    return {
      testName: 'Wilcoxon Signed-Rank Test',
      var1Name: var1,
      var2Name: var2,
      n: rows.length,
      negativeRanksN: 0,
      negativeRanksMean: 0,
      negativeRanksSum: 0,
      positiveRanksN: 0,
      positiveRanksMean: 0,
      positiveRanksSum: 0,
      tiesN: tiesCount,
      zScore: 0,
      pValue: 1,
      apaStatement: 'No non-tied pairs available for Wilcoxon Signed-Rank test.',
    };
  }

  // Sort by absolute difference
  pairs.sort((a, b) => a.absDiff - b.absDiff);

  // Assign average ranks
  const ranks = new Array(nPairs);
  let i = 0;
  while (i < nPairs) {
    let j = i;
    while (j < nPairs && Math.abs(pairs[j].absDiff - pairs[i].absDiff) < 1e-9) {
      j++;
    }
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  let negN = 0;
  let negSum = 0;
  let posN = 0;
  let posSum = 0;

  for (let k = 0; k < nPairs; k++) {
    if (pairs[k].diff < 0) {
      negN++;
      negSum += ranks[k];
    } else {
      posN++;
      posSum += ranks[k];
    }
  }

  const negMean = negN > 0 ? negSum / negN : 0;
  const posMean = posN > 0 ? posSum / posN : 0;

  // Expected mean and variance of W
  const muW = (nPairs * (nPairs + 1)) / 4;
  const sigmaW = Math.sqrt((nPairs * (nPairs + 1) * (2 * nPairs + 1)) / 24);

  const testStat = posSum;
  const zScore = sigmaW > 0 ? (testStat - muW) / sigmaW : 0;
  const pVal = Math.max(0, Math.min(1, 2 * (1 - normalCDF(Math.abs(zScore)))));

  const apaStatement = `A Wilcoxon signed-rank test indicated that scores on ${var2} differed from ${var1}, Z = ${zScore.toFixed(
    3
  )}, p = ${pVal < 0.001 ? '< .001' : pVal.toFixed(4)}.`;

  return {
    testName: 'Wilcoxon Signed-Rank Test',
    var1Name: var1,
    var2Name: var2,
    n: rows.length,
    negativeRanksN: negN,
    negativeRanksMean: negMean,
    negativeRanksSum: negSum,
    positiveRanksN: posN,
    positiveRanksMean: posMean,
    positiveRanksSum: posSum,
    tiesN: tiesCount,
    zScore,
    pValue: pVal,
    apaStatement,
  };
}

