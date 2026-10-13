import os
import json
import pandas as pd
from services.worker.app.celery_app import celery_app

@celery_app.task(bind=True)
def execute_statistical_job(self, job_id: str, file_path: str, group_col: str, value_col: str):
    # Try importing compiled Rust core
    try:
        import spss_core
    except ImportError:
        spss_core = None

    # 1. Ingest Data (Supports Parquet or CSV/SPSS converted files)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset path {file_path} not found.")

    if file_path.endswith(".parquet"):
        df = pd.read_parquet(file_path, columns=[group_col, value_col])
    else:
        df = pd.read_csv(file_path, usecols=[group_col, value_col])

    # Clean nulls
    clean_df = df.dropna(subset=[group_col, value_col])
    groups = clean_df[group_col].unique()

    if len(groups) != 2:
        raise ValueError(f"Automated comparison requires exactly 2 distinct levels. Found: {len(groups)}")

    # Extract clean contiguous floating point arrays
    g1 = clean_df[clean_df[group_col] == groups[0]][value_col].astype(float).tolist()
    g2 = clean_df[clean_df[group_col] == groups[1]][value_col].astype(float).tolist()

    # 2. Invoke Rust Engine
    if spss_core is not None:
        raw_json_report = spss_core.analyze_groups(g1, g2)
        report_dict = json.loads(raw_json_report)
    else:
        # Fallback if extension not yet compiled locally
        report_dict = {
            "test_category": "FallbackNote",
            "details": "Rust core (spss_core) not installed yet."
        }

    # 3. Decorate with APA standard reporting
    if report_dict.get("test_category") == "Parametric":
        details = report_dict["details"]
        t = details["t_statistic"]
        df_val = details["degrees_of_freedom"]
        p = details["p_value"]
        d = details["cohens_d"]
        apa = f"Welch's t({df_val:.2f}) = {t:.3f}, p = {p:.4f}, Cohen's d = {d:.2f}."
    else:
        apa = "Non-parametric alternatives selected based on normality check failure."

    return {
        "job_id": job_id,
        "variables": {"group_column": group_col, "value_column": value_col},
        "engine_findings": report_dict,
        "apa_statement": apa,
    }
