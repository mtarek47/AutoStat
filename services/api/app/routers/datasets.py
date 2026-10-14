import os
import tempfile
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import pyreadstat

router = APIRouter(prefix="/datasets", tags=["datasets"])

class ColumnMetadataModel(BaseModel):
    name: str
    label: str
    type: str = "numeric"
    measure: str = "scale"
    role: str = "input"
    decimals: int = 2
    width: int = 8
    align: Optional[str] = "right"
    valueLabels: Optional[Dict[str, str]] = None

class ExportSavRequest(BaseModel):
    name: str
    columns: List[ColumnMetadataModel]
    rows: List[Dict[str, Any]]

@router.post("/parse-sav")
async def parse_sav_file(file: UploadFile = File(...)):
    """
    Parses native IBM SPSS (.sav / .zsav) binary files into AutoStat Dataset format,
    preserving variable labels, value label dictionaries, types, and measurement levels.
    """
    filename = file.filename or "dataset.sav"
    suffix = ".zsav" if filename.endswith(".zsav") else ".sav"
    
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        df, meta = pyreadstat.read_sav(tmp_path)
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse SPSS .sav file: {str(e)}")

    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    # Build Column Metadata conforming to AutoStat frontend
    columns_meta = []
    col_names = meta.column_names or list(df.columns)
    col_labels = meta.column_labels or []
    val_labels = meta.variable_value_labels or {}
    measures = meta.variable_measure or {}
    display_widths = meta.variable_display_width or {}

    for idx, col in enumerate(col_names):
        label = col_labels[idx] if idx < len(col_labels) and col_labels[idx] else col
        raw_measure = str(measures.get(col, "scale")).lower()
        if "nom" in raw_measure:
            measure = "nominal"
        elif "ord" in raw_measure:
            measure = "ordinal"
        else:
            measure = "scale"

        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        col_type = "numeric" if is_numeric else "string"
        
        # Check value labels dictionary
        dict_labels = val_labels.get(col, {})
        # Convert numeric keys to string keys for JSON serialization
        formatted_labels = {str(k).rstrip(".0") if isinstance(k, float) and k.is_integer() else str(k): str(v) for k, v in dict_labels.items()} if dict_labels else None

        decimals = 2 if is_numeric else 0
        width = int(display_widths.get(col, 8))

        columns_meta.append({
            "name": col,
            "label": label,
            "type": col_type,
            "measure": measure,
            "role": "input",
            "decimals": decimals,
            "width": width,
            "align": "right" if is_numeric else "left",
            "valueLabels": formatted_labels
        })

    # Clean rows for JSON serialization (replace NaN, Infinity with None)
    clean_df = df.where(pd.notnull(df), None)
    rows_data = clean_df.to_dict(orient="records")

    return {
        "id": str(uuid.uuid4()),
        "name": filename,
        "columns": columns_meta,
        "rows": rows_data,
        "createdAt": pd.Timestamp.now().isoformat()
    }

@router.post("/export-sav")
async def export_sav_file(data: ExportSavRequest):
    """
    Exports an AutoStat Dataset into a native IBM SPSS (.sav) binary file.
    """
    if not data.columns or not data.rows:
        raise HTTPException(status_code=400, detail="Columns and rows must not be empty.")

    col_names = [c.name for c in data.columns]
    df = pd.DataFrame(data.rows)[col_names]

    column_labels = {c.name: c.label for c in data.columns if c.label}
    variable_measure = {c.name: c.measure for c in data.columns if c.measure}
    
    variable_value_labels = {}
    for c in data.columns:
        if c.valueLabels:
            # Convert keys to floats or ints if numeric
            parsed_dict = {}
            for k, v in c.valueLabels.items():
                try:
                    num_k = float(k)
                    parsed_dict[num_k] = v
                except ValueError:
                    parsed_dict[k] = v
            variable_value_labels[c.name] = parsed_dict

    with tempfile.NamedTemporaryFile(suffix=".sav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        pyreadstat.write_sav(
            df,
            tmp_path,
            column_labels=column_labels if column_labels else None,
            variable_value_labels=variable_value_labels if variable_value_labels else None,
            variable_measure=variable_measure if variable_measure else None
        )
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Failed to generate SPSS .sav file: {str(e)}")

    download_name = data.name if data.name.endswith(".sav") else f"{data.name}.sav"
    return FileResponse(
        tmp_path,
        media_type="application/x-spss-sav",
        filename=download_name
    )
