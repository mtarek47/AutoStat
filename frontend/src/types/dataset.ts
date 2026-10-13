export type VariableMeasure = 'scale' | 'nominal' | 'ordinal';
export type VariableRole = 'input' | 'target' | 'both' | 'none';
export type VariableType = 'numeric' | 'dollar' | 'string' | 'date';
export type VariableAlign = 'left' | 'right' | 'center';

export interface ColumnMetadata {
  name: string;
  label: string;
  type: VariableType;
  measure: VariableMeasure;
  role: VariableRole;
  decimals: number;
  width: number;
  align?: VariableAlign;
  missingValues?: string;
  valueLabels?: Record<string | number, string>;
}

export interface Dataset {
  id: string;
  name: string;
  columns: ColumnMetadata[];
  rows: Record<string, any>[];
  createdAt: string;
}

export interface DescriptiveStats {
  variable: string;
  n: number;
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  isNormal: boolean;
}

export interface WelchTResult {
  testName: string;
  group1Name: string;
  group2Name: string;
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
  n1: number;
  n2: number;
  tStatistic: number;
  df: number;
  pValue: number;
  cohensD: number;
  apaStatement: string;
  isNormalGroup1: boolean;
  isNormalGroup2: boolean;
  recommendation: string;
}

export interface AnovaGroupStat {
  groupName: string;
  n: number;
  mean: number;
  sd: number;
  se: number;
}

export interface AnovaPostHocComparison {
  comparison: string;
  diff: number;
  pValue: number;
  isSignificant: boolean;
}

export interface AnovaResult {
  testName: string;
  dependentVar: string;
  factorVar: string;
  groupStats: AnovaGroupStat[];
  ssBetween: number;
  ssWithin: number;
  ssTotal: number;
  dfBetween: number;
  dfWithin: number;
  dfTotal: number;
  msBetween: number;
  msWithin: number;
  fStatistic: number;
  pValue: number;
  etaSquared: number;
  postHoc: AnovaPostHocComparison[];
  apaStatement: string;
}

export interface CorrelationCell {
  r: number;
  pValue: number;
  n: number;
  isSignificant05: boolean;
  isSignificant01: boolean;
}

export interface CorrelationResult {
  method: 'pearson' | 'spearman';
  variables: string[];
  matrix: Record<string, Record<string, CorrelationCell>>;
  apaStatements: string[];
}

export interface PairedTResult {
  testName: string;
  var1Name: string;
  var2Name: string;
  n: number;
  mean1: number;
  mean2: number;
  meanDiff: number;
  sdDiff: number;
  seDiff: number;
  tStatistic: number;
  df: number;
  pValue: number;
  cohensD: number;
  apaStatement: string;
}

export interface OneSampleTResult {
  testName: string;
  varName: string;
  testValue: number;
  n: number;
  mean: number;
  sd: number;
  meanDiff: number;
  se: number;
  tStatistic: number;
  df: number;
  pValue: number;
  cohensD: number;
  apaStatement: string;
}

export interface ChiSquareResult {
  testName: string;
  rowVar: string;
  colVar: string;
  rowCategories: string[];
  colCategories: string[];
  observed: Record<string, Record<string, number>>;
  expected: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
  chiSquare: number;
  df: number;
  pValue: number;
  cramersV: number;
  apaStatement: string;
}

export interface RegressionCoefficient {
  term: string;
  b: number;
  stdError: number;
  beta: number;
  t: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  tolerance: number;
  vif: number;
}

export interface RegressionResult {
  testName: string;
  dependentVar: string;
  predictors: string[];
  n: number;
  r: number;
  rSquared: number;
  adjRSquared: number;
  stdErrorEstimate: number;
  ssRegression: number;
  ssResidual: number;
  ssTotal: number;
  dfRegression: number;
  dfResidual: number;
  dfTotal: number;
  msRegression: number;
  msResidual: number;
  fStatistic: number;
  fPValue: number;
  coefficients: RegressionCoefficient[];
  apaStatement: string;
}

export interface ItemTotalStat {
  item: string;
  scaleMeanIfDeleted: number;
  scaleVarianceIfDeleted: number;
  correctedItemTotalCorr: number;
  cronbachAlphaIfDeleted: number;
}

export interface ReliabilityResult {
  testName: string;
  items: string[];
  nCases: number;
  nItems: number;
  cronbachAlpha: number;
  stdCronbachAlpha: number;
  scaleMean: number;
  scaleVariance: number;
  scaleSd: number;
  itemStats: ItemTotalStat[];
  apaStatement: string;
}

export interface MannWhitneyResult {
  testName: string;
  dependentVar: string;
  groupingVar: string;
  group1Name: string;
  group2Name: string;
  n1: number;
  n2: number;
  meanRank1: number;
  meanRank2: number;
  sumRanks1: number;
  sumRanks2: number;
  uStatistic: number;
  wStatistic: number;
  zScore: number;
  pValue: number;
  apaStatement: string;
}

export interface KruskalWallisGroupStat {
  groupName: string;
  n: number;
  meanRank: number;
  sumRanks: number;
}

export interface KruskalWallisResult {
  testName: string;
  dependentVar: string;
  groupingVar: string;
  totalN: number;
  groupStats: KruskalWallisGroupStat[];
  hStatistic: number;
  df: number;
  pValue: number;
  apaStatement: string;
}

export interface LogisticCoefficient {
  term: string;
  b: number;
  se: number;
  wald: number;
  df: number;
  pValue: number;
  expB: number;
  ciLowerExpB: number;
  ciUpperExpB: number;
}

export interface LogisticRegressionResult {
  testName: string;
  dependentVar: string;
  covariates: string[];
  n: number;
  minus2LogLikelihood: number;
  coxSnellR2: number;
  nagelkerkeR2: number;
  omnibusChiSquare: number;
  omnibusDf: number;
  omnibusPValue: number;
  overallPercentageCorrect: number;
  classificationTable: {
    observed0Predicted0: number;
    observed0Predicted1: number;
    observed1Predicted0: number;
    observed1Predicted1: number;
    percentCorrect0: number;
    percentCorrect1: number;
    totalPercentCorrect: number;
  };
  coefficients: LogisticCoefficient[];
  apaStatement: string;
}

export interface WilcoxonResult {
  testName: string;
  var1Name: string;
  var2Name: string;
  n: number;
  negativeRanksN: number;
  negativeRanksMean: number;
  negativeRanksSum: number;
  positiveRanksN: number;
  positiveRanksMean: number;
  positiveRanksSum: number;
  tiesN: number;
  zScore: number;
  pValue: number;
  apaStatement: string;
}

