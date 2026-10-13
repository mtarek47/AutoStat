import { Dataset, ColumnMetadata } from '../types/dataset';

export interface RecodeRule {
  type: 'exact' | 'range' | 'else';
  oldValue?: string | number;
  rangeMin?: number;
  rangeMax?: number;
  newValue: string | number;
}

/**
 * Sorts dataset rows by one column in ascending or descending order.
 */
export function sortDataset(
  dataset: Dataset,
  colName: string,
  direction: 'asc' | 'desc' = 'asc'
): Dataset {
  const colMeta = dataset.columns.find((c) => c.name === colName);
  const isNumeric = colMeta?.type === 'numeric' || colMeta?.type === 'dollar';

  const sortedRows = [...dataset.rows].sort((a, b) => {
    const valA = a[colName];
    const valB = b[colName];

    if (valA === null || valA === undefined || valA === '') return 1;
    if (valB === null || valB === undefined || valB === '') return -1;

    if (isNumeric) {
      const numA = Number(valA);
      const numB = Number(valB);
      return direction === 'asc' ? numA - numB : numB - numA;
    } else {
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
  });

  return {
    ...dataset,
    rows: sortedRows,
  };
}

/**
 * Filters dataset rows based on a JavaScript-like boolean expression (e.g., `age > 25 && gender == 1`).
 */
export function filterDataset(
  dataset: Dataset,
  expression: string
): { filteredDataset: Dataset; matchingCount: number; totalCount: number } {
  if (!expression.trim()) {
    return { filteredDataset: dataset, matchingCount: dataset.rows.length, totalCount: dataset.rows.length };
  }

  const matchingRows = dataset.rows.filter((row) => {
    try {
      const colNames = dataset.columns.map((c) => c.name);
      const colValues = colNames.map((name) => row[name]);
      const fn = new Function(...colNames, `return Boolean(${expression});`);
      return fn(...colValues);
    } catch {
      return false;
    }
  });

  return {
    filteredDataset: {
      ...dataset,
      rows: matchingRows,
    },
    matchingCount: matchingRows.length,
    totalCount: dataset.rows.length,
  };
}

/**
 * SPSS Recode into Different Variables
 * Maps old values or numeric ranges into a brand new variable.
 */
export function recodeIntoDifferentVariable(
  dataset: Dataset,
  sourceCol: string,
  targetColName: string,
  targetColLabel: string,
  rules: RecodeRule[]
): Dataset {
  const newCol: ColumnMetadata = {
    name: targetColName,
    label: targetColLabel || targetColName,
    type: 'numeric',
    measure: 'ordinal',
    role: 'input',
    decimals: 0,
    width: 8,
    align: 'right',
  };

  const updatedRows = dataset.rows.map((row) => {
    const currentVal = row[sourceCol];
    let recodedVal: any = currentVal;

    for (const rule of rules) {
      if (rule.type === 'exact') {
        if (String(currentVal) === String(rule.oldValue)) {
          recodedVal = rule.newValue;
          break;
        }
      } else if (rule.type === 'range') {
        const numVal = Number(currentVal);
        const min = rule.rangeMin !== undefined ? rule.rangeMin : -Infinity;
        const max = rule.rangeMax !== undefined ? rule.rangeMax : Infinity;
        if (!isNaN(numVal) && numVal >= min && numVal <= max) {
          recodedVal = rule.newValue;
          break;
        }
      } else if (rule.type === 'else') {
        recodedVal = rule.newValue;
      }
    }

    return {
      ...row,
      [targetColName]: recodedVal,
    };
  });

  // Check if column already exists
  const existingColIndex = dataset.columns.findIndex((c) => c.name === targetColName);
  let updatedColumns = [...dataset.columns];
  if (existingColIndex >= 0) {
    updatedColumns[existingColIndex] = newCol;
  } else {
    updatedColumns.push(newCol);
  }

  return {
    ...dataset,
    columns: updatedColumns,
    rows: updatedRows,
  };
}
