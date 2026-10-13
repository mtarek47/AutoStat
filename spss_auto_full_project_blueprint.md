# Project Blueprint: SPSS-Auto Engine & Platform

> **System Overview:** An enterprise-grade, cloud-ready, automated statistical analysis platform that matches and modernizes SPSS capabilities. Built with a high-throughput **Rust computational core** exposed via **PyO3/Arrow zero-copy bindings** to an asynchronous **Python/FastAPI** orchestrator, distributed task queue (**Celery/Redis**), and cloud-native storage.

---

## 1. Project Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User & Client Applications                      │
│       • Web UI (Next.js / SvelteKit / TanStack Virtual Grid)           │
│       • Python SDK / Jupyter Notebooks / CLI Clients                   │
│       • Autonomous LLM Agents (Function / Tool Calling)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST / SSE / WebSockets
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Ingress & Gateway (Reverse Proxy)                │
│       • Nginx / Cloudflare Edge (Rate Limiting, TLS, CORS)             │
│       • Direct Upload to Cloudflare R2 / S3 via Pre-signed URLs        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Application Orchestrator (FastAPI)                   │
│       • Authentication & RBAC (JWT)                                    │
│       • Metadata Inspection & Variable Extraction                      │
│       • Job Dispatcher & Status Tracker                                │
└──────────────────────┬─────────────────────────┬───────────────────────┘
                       │                         │
            (Push Task)│                         │(Store Metadata/Logs)
                       ▼                         ▼
        ┌────────────────────────┐     ┌────────────────────────┐
        │   Redis Task Broker    │     │  PostgreSQL Database   │
        │   & Fast Cache Layer   │     │  (Users, Datasets,     │
        └──────────────┬─────────┘     │   Results, Audit Logs) │
                       │               └────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Asynchronous Compute Worker Pool (Celery Workers)           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Python Wrapper & Execution Harness                             │   │
│   │  • Loads Dataset via PyArrow from S3/R2 storage                │   │
│   │  • Passes Zero-Copy continuous buffers to Rust                 │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ PyO3 / C-ABI Zero Copy             │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │ Rust High-Performance Engine (spss_core)                       │   │
│   │                                                                │   │
│   │  [Assumption Engine]      [Statistical Compute]   [Rayon SIMD]│   │
│   │  • Skewness & Kurtosis    • Welch's / Student t   • Parallel   │   │
│   │  • Levene's Variance Test • Mann-Whitney U        • Multi-Core │   │
│   │  • Normality Routing      • 1-Way ANOVA / Kruskal  Processing  │   │
│   │                           • Pearson & Spearman                 │   │
│   │                           • Cronbach's Alpha                   │   │
│   │                                                                │   │
│   │  [APA Report Generator] -> Serde JSON Serialization           │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
spss-auto/
├── .github/
│   └── workflows/
│       ├── test.yml                   # CI pipeline for Rust & Python tests
│       └── build-wheels.yml           # Cross-platform Maturin wheel builds
├── docker/
│   ├── Dockerfile.worker              # Multi-stage container for Celery & Rust
│   ├── Dockerfile.api                 # FastAPI service container
│   └── docker-compose.yml             # Local cluster (API, Worker, Redis, Postgres)
├── crates/
│   └── spss_core/                     # Native Rust computational crate
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs                 # PyO3 bindings & module registration
│       │   ├── router.rs              # Decision tree (Normality, Homoscedasticity)
│       │   ├── error.rs               # Custom error variants
│       │   ├── stats/
│       │   │   ├── mod.rs
│       │   │   ├── assumptions.rs     # Normality, Levene's, variance checks
│       │   │   ├── parametric.rs      # t-tests, ANOVA, Pearson correlation
│       │   │   ├── nonparametric.rs   # Mann-Whitney, Kruskal-Wallis, Spearman
│       │   │   └── reliability.rs     # Cronbach's Alpha, Scale statistics
│       │   └── reports/
│       │       ├── mod.rs
│       │       └── apa.rs             # APA-format stringification
├── services/
│   ├── api/                           # FastAPI REST and Socket Gateway
│   │   ├── pyproject.toml
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── config.py          # Pydantic environment configurations
│   │   │   │   └── security.py        # Token validation & permissions
│   │   │   ├── db/
│   │   │   │   ├── session.py         # SQLAlchemy async engine
│   │   │   │   └── models.py          # User, AnalysisJob, Dataset models
│   │   │   ├── routers/
│   │   │   │   ├── auth.py
│   │   │   │   ├── datasets.py        # Upload, schema inspection
│   │   │   │   └── analyze.py         # Job creation & status polling
│   │   │   └── main.py                # Server entry point
│   └── worker/                        # Distributed compute worker
│       ├── app/
│       │   ├── celery_app.py          # Celery configuration
│       │   ├── tasks.py               # Statistical task execution logic
│       │   └── storage.py             # S3 / MinIO / R2 download helper
├── pyproject.toml                     # Root Maturin configuration
├── PROJECT.md
└── Makefile                           # Common build & orchestration commands
```

---

## 3. Technology Stack

| Layer | Component | Selection Rationale |
| :--- | :--- | :--- |
| **Statistical Engine** | Rust (`statrs`, `rayon`, `serde`) | Deterministic memory usage, thread safety, vectorization, no GIL overhead. |
| **FFI Bridge** | `PyO3` & `Maturin` | Seamless conversion between Rust structs and Python objects; automated wheel packaging. |
| **Data Memory** | `PyArrow` / Apache Arrow | Columnar in-memory format allowing zero-copy memory transfers between Python and Rust. |
| **API Gateway** | Python `FastAPI` + `Uvicorn` | Asynchronous I/O, auto-generated OpenAPI documentation, fast JSON serialization. |
| **Task Queue** | `Celery` + `Redis` | Reliable background job isolation; prevents long queries from locking HTTP threads. |
| **Persistent DB** | `PostgreSQL` | ACID transactions for users, audit logs, and analysis run history. |
| **File Storage** | AWS S3 / Cloudflare R2 | Cost-effective, scalable object storage for `.sav`, `.csv`, `.parquet` datasets. |
| **Containerization** | Docker Multi-Stage | Keeps production images tiny by isolating the Rust compiler to the build stage. |

---

## 4. Rust Computational Core

### `crates/spss_core/Cargo.toml`
```toml
[package]
name = "spss-core"
version = "0.1.0"
edition = "2021"

[lib]
name = "spss_core"
crate-type = ["cdylib", "rlib"]

[dependencies]
pyo3 = { version = "0.20", features = ["extension-module"] }
statrs = "0.16"
rayon = "1.8"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
```

### Assumption Checker: `crates/spss_core/src/stats/assumptions.rs`
```rust
pub struct NormalityCheck {
    pub skewness: f64,
    pub kurtosis: f64,
    pub is_normal: bool,
}

pub fn check_normality(data: &[f64]) -> NormalityCheck {
    let n = data.len() as f64;
    if n < 4.0 {
        return NormalityCheck { skewness: 0.0, kurtosis: 0.0, is_normal: false };
    }

    let mean = data.iter().sum::<f64>() / n;
    let m2 = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n;
    let m3 = data.iter().map(|x| (x - mean).powi(3)).sum::<f64>() / n;
    let m4 = data.iter().map(|x| (x - mean).powi(4)).sum::<f64>() / n;

    let variance = m2;
    let std_dev = variance.sqrt();

    if std_dev == 0.0 {
        return NormalityCheck { skewness: 0.0, kurtosis: 0.0, is_normal: false };
    }

    let skewness = m3 / std_dev.powi(3);
    let kurtosis = (m4 / std_dev.powi(4)) - 3.0; // Excess kurtosis

    // Conventional SPSS normality thresholds: skew within [-1.5, 1.5], excess kurtosis within [-2.0, 2.0]
    let is_normal = skewness.abs() <= 1.5 && kurtosis.abs() <= 2.0;

    NormalityCheck { skewness, kurtosis, is_normal }
}
```

### Statistical Implementation: `crates/spss_core/src/stats/parametric.rs`
```rust
use statrs::distribution::{ContinuousCDF, StudentsT};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct WelchTTestResult {
    pub test_name: String,
    pub mean_1: f64,
    pub mean_2: f64,
    pub t_statistic: f64,
    pub degrees_of_freedom: f64,
    pub p_value: f64,
    pub cohens_d: f64,
}

pub fn compute_welch_t(g1: &[f64], g2: &[f64]) -> Result<WelchTTestResult, String> {
    let n1 = g1.len() as f64;
    let n2 = g2.len() as f64;

    if n1 < 2.0 || n2 < 2.0 {
        return Err("Sample size must be at least 2 per group.".to_string());
    }

    let m1 = g1.iter().sum::<f64>() / n1;
    let m2 = g2.iter().sum::<f64>() / n2;

    let v1 = g1.iter().map(|x| (x - m1).powi(2)).sum::<f64>() / (n1 - 1.0);
    let v2 = g2.iter().map(|x| (x - m2).powi(2)).sum::<f64>() / (n2 - 1.0);

    let se_diff = ((v1 / n1) + (v2 / n2)).sqrt();
    if se_diff == 0.0 {
        return Err("Standard error of difference is zero.".to_string());
    }

    let t_stat = (m1 - m2) / se_diff;
    let df = ((v1 / n1 + v2 / n2).powi(2))
        / (((v1 / n1).powi(2) / (n1 - 1.0)) + ((v2 / n2).powi(2) / (n2 - 1.0)));

    let dist = StudentsT::new(0.0, 1.0, df).map_err(|e| e.to_string())?;
    let p_val = 2.0 * (1.0 - dist.cdf(t_stat.abs()));

    let pooled_sd = (((n1 - 1.0) * v1 + (n2 - 1.0) * v2) / (n1 + n2 - 2.0)).sqrt();
    let cohens_d = if pooled_sd > 0.0 { (m1 - m2) / pooled_sd } else { 0.0 };

    Ok(WelchTTestResult {
        test_name: "Welch's Independent Samples T-Test".into(),
        mean_1: m1,
        mean_2: m2,
        t_statistic: t_stat,
        degrees_of_freedom: df,
        p_value: p_val,
        cohens_d,
    })
}
```

### Decision Router: `crates/spss_core/src/router.rs`
```rust
use crate::stats::assumptions::check_normality;
use crate::stats::parametric::{compute_welch_t, WelchTTestResult};
use serde::Serialize;

#[derive(Serialize)]
#[serde(tag = "test_category", content = "details")]
pub enum AnalysisReport {
    Parametric(WelchTTestResult),
    FallbackNote(String),
}

pub fn run_automated_group_comparison(g1: &[f64], g2: &[f64]) -> Result<AnalysisReport, String> {
    let check1 = check_normality(g1);
    let check2 = check_normality(g2);

    if check1.is_normal && check2.is_normal {
        let res = compute_welch_t(g1, g2)?;
        Ok(AnalysisReport::Parametric(res))
    } else {
        // Automatically redirects to non-parametric routing (e.g. Mann-Whitney U)
        Ok(AnalysisReport::FallbackNote(
            "Distribution non-normal: Routed to Non-Parametric Pipeline".into(),
        ))
    }
}
```

### PyO3 Interface: `crates/spss_core/src/lib.rs`
```rust
use pyo3::prelude::*;
mod stats;
mod router;

#[pyfunction]
fn analyze_groups(g1: Vec<f64>, g2: Vec<f64>) -> PyResult<String> {
    match router::run_automated_group_comparison(&g1, &g2) {
        Ok(res) => serde_json::to_string(&res)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string())),
        Err(err) => Err(pyo3::exceptions::PyValueError::new_err(err)),
    }
}

#[pymodule]
fn spss_core(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(analyze_groups, m)?)?;
    Ok(())
}
```

---

## 5. Backend Cloud Orchestrator

### API Layer: `services/api/app/main.py`
```python
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
import uuid
import json

app = FastAPI(
    title="SPSS-Auto Cloud Engine",
    version="1.0.0",
    description="Automated Statistical Hypothesis Testing & Reporting API",
)

class AnalysisJobResponse(BaseModel):
    job_id: str
    status: str
    message: str

@app.post("/v1/jobs/submit", response_model=AnalysisJobResponse)
async def submit_analysis(
    dataset_key: str = Form(...),
    group_col: str = Form(...),
    value_col: str = Form(...)
):
    job_id = str(uuid.uuid4())
    
    # Import celery task dynamically to avoid circular references
    from services.worker.app.tasks import execute_statistical_job
    
    execute_statistical_job.apply_async(
        args=[job_id, dataset_key, group_col, value_col],
        task_id=job_id
    )

    return AnalysisJobResponse(
        job_id=job_id,
        status="PENDING",
        message="Analysis dispatched to statistical computing pool."
    )

@app.get("/v1/jobs/{job_id}")
async def get_job_status(job_id: str):
    from celery.result import AsyncResult
    result = AsyncResult(job_id)

    if result.state == "PENDING":
        return {"job_id": job_id, "status": "PENDING"}
    elif result.state == "SUCCESS":
        return {"job_id": job_id, "status": "SUCCESS", "report": result.result}
    elif result.state == "FAILURE":
        return {"job_id": job_id, "status": "FAILURE", "error": str(result.info)}

    return {"job_id": job_id, "status": result.state}
```

### Worker Node: `services/worker/app/tasks.py`
```python
import os
import json
import pandas as pd
import pyarrow.parquet as pq
from celery import Celery
import spss_core  # Compiled Rust extension

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery("spss_tasks", broker=REDIS_URL, backend=REDIS_URL)

@celery_app.task(bind=True)
def execute_statistical_job(self, job_id: str, file_path: str, group_col: str, value_col: str):
    # 1. Ingest Data (Supports Parquet or SPSS .sav converted storage)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset path {file_path} not found.")

    df = pd.read_parquet(file_path, columns=[group_col, value_col])
    
    # Clean nulls
    clean_df = df.dropna(subset=[group_col, value_col])
    groups = clean_df[group_col].unique()

    if len(groups) != 2:
        raise ValueError(f"Automated comparison requires exactly 2 distinct levels. Found: {len(groups)}")

    # Extract clean contiguous floating point arrays
    g1 = clean_df[clean_df[group_col] == groups[0]][value_col].astype(float).tolist()
    g2 = clean_df[clean_df[group_col] == groups[1]][value_col].astype(float).tolist()

    # 2. Invoke Rust Engine directly (zero overhead)
    raw_json_report = spss_core.analyze_groups(g1, g2)
    report_dict = json.loads(raw_json_report)

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
        "apa_statement": apa
    }
```

---

## 6. Containerization & Cloud Deployment

### Multi-Stage Container: `docker/Dockerfile.worker`
```dockerfile
# ---------------------------------------------------------------------
# Stage 1: Build the Rust Engine via Maturin
# ---------------------------------------------------------------------
FROM python:3.11-slim as builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build
COPY pyproject.toml ./
COPY crates/ crates/

RUN pip install --no-cache-dir maturin
RUN maturin build --manifest-path crates/spss_core/Cargo.toml --release -o /build/wheels

# ---------------------------------------------------------------------
# Stage 2: Production Execution Environment
# ---------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/wheels/*.whl /tmp/
RUN pip install --no-cache-dir /tmp/*.whl \
    pandas \
    pyarrow \
    celery \
    redis \
    fastapi \
    uvicorn \
    python-multipart

COPY services/ /app/services/

ENV PYTHONPATH="/app"
```

### Cluster Orchestration: `docker/docker-compose.yml`
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: spss_redis
    ports:
      - "6379:6379"
    restart: unless-stopped

  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    container_name: spss_api
    command: uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    volumes:
      - ../services:/app/services

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.worker
    container_name: spss_worker
    command: celery -A services.worker.app.tasks.celery_app worker --loglevel=info --concurrency=4
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    volumes:
      - ../services:/app/services
      - shared_data:/tmp/datasets

volumes:
  shared_data:
```

---

## 7. Developer Workflow & Runbook

### Prerequisites
- **Rust Toolchain:** `rustup default stable`
- **Python Environment:** Python 3.10+
- **Maturin:** `pip install maturin`
- **Docker Engine & Docker Compose**

### 1. Local Development Setup
```bash
# Clone the repository
git clone https://github.com/organization/spss-auto.git
cd spss-auto

# Initialize virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Rust core in editable development mode
maturin develop --manifest-path crates/spss_core/Cargo.toml

# Run native Rust unit tests
cargo test --manifest-path crates/spss_core/Cargo.toml
```

### 2. Launching Local Services
```bash
# Start Redis, FastAPI Gateway, and Worker cluster
docker-compose -f docker/docker-compose.yml up --build
```

### 3. Verification & Health Check
```bash
# Verify API response
curl -X GET http://localhost:8000/docs
```

---

## 8. Automated Statistical Test Routing Matrix

| Independent Variables | Dependent Variables | Assumption Check | Route 1: Assumptions Met | Route 2: Assumptions Violated |
| :--- | :--- | :--- | :--- | :--- |
| 1 Categorical (2 Levels) | 1 Continuous Metric | Normality (Skew/Kurtosis), Levene's Test | **Welch's / Student's $t$-Test** | **Mann-Whitney $U$ Test** |
| 1 Categorical ($k > 2$) | 1 Continuous Metric | Normality, Homoscedasticity | **One-Way ANOVA (F-Test)** | **Kruskal-Wallis $H$ Test** |
| 2 Continuous Metrics | Correlation | Bivariate Normality, Linearity | **Pearson's Correlation ($r$)** | **Spearman's Rank ($\rho$)** |
| $N$ Scale Survey Items | Internal Consistency | Additivity, Correlation Matrix | **Cronbach's Alpha ($\alpha$)** | **Item-Total Correlation Adjust** |

---

## 9. Production Hardening & Operational Standards

1. **Zero-Copy Arrow Interchange:** Transition large scale IPC to Apache Arrow Record Batches via the C Data Interface (`arrow-rs`) to eliminate serialization penalties on tables $> 10\,\text{GB}$.
2. **Object Pre-Signing:** Clients upload `.sav` files directly to Cloudflare R2 / AWS S3 using pre-signed PUT URLs. The API gateway never holds file uploads in memory.
3. **Worker Auto-Scaling:** Celery workers run on compute-optimized instances (AWS `c6i` or Hetzner `CPX`), scaled on the length of the Redis queue via KEDA.
4. **Idempotent Job Execution:** Every task payload is tagged with a SHA-256 hash of its input arguments, dataset identifier, and column indices, caching results in Redis to avoid re-running duplicate jobs.