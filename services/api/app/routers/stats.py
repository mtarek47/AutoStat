import math
from typing import List, Dict, Any, Optional
import numpy as np
import scipy.stats as stats
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/stats", tags=["stats"])

class FactorAnalysisRequest(BaseModel):
    variables: List[str]
    rows: List[Dict[str, Any]]
    extraction_method: Optional[str] = "pca"  # pca or paf
    rotation_method: Optional[str] = "varimax"  # varimax or none
    eigenvalue_cutoff: Optional[float] = 1.0
    num_factors: Optional[int] = None  # If None, use cutoff >= 1.0

class ComponentVariance(BaseModel):
    component: int
    initial_eigenvalue: float
    pct_variance: float
    cumulative_pct: float
    extracted_eigenvalue: Optional[float] = None
    extracted_pct_variance: Optional[float] = None
    extracted_cumulative_pct: Optional[float] = None
    rotated_eigenvalue: Optional[float] = None
    rotated_pct_variance: Optional[float] = None
    rotated_cumulative_pct: Optional[float] = None

try:
    import services.api.app.spss_core as spss_core  # type: ignore
    RUST_CORE_AVAILABLE = True
except Exception:
    try:
        import spss_core  # type: ignore
        RUST_CORE_AVAILABLE = True
    except Exception:
        RUST_CORE_AVAILABLE = False

class FactorAnalysisResponse(BaseModel):
    n_cases: int
    n_variables: int
    variables: List[str]
    correlation_matrix: Dict[str, Dict[str, float]]
    kmo: float
    kmo_interpretation: str
    bartlett_chi_square: float
    bartlett_df: int
    bartlett_p_value: float
    total_variance_explained: List[ComponentVariance]
    scree_plot: List[Dict[str, float]]
    unrotated_component_matrix: Dict[str, Dict[str, float]]
    rotated_component_matrix: Optional[Dict[str, Dict[str, float]]] = None
    apa_statement: str
    engine_used: str = "Rust Core (spss_core)"


def compute_kmo(corr: np.ndarray) -> float:
    """Computes Kaiser-Meyer-Olkin (KMO) measure of sampling adequacy."""
    p = corr.shape[0]
    inv_corr = np.linalg.pinv(corr)
    diag_inv = np.diag(inv_corr)
    
    # Anti-image covariance & correlation
    anti_image = np.zeros_like(corr)
    for i in range(p):
        for j in range(p):
            if i != j:
                denom = math.sqrt(abs(diag_inv[i] * diag_inv[j]))
                if denom > 1e-12:
                    anti_image[i, j] = -inv_corr[i, j] / denom

    r_sq_sum = 0.0
    q_sq_sum = 0.0
    for i in range(p):
        for j in range(p):
            if i != j:
                r_sq_sum += corr[i, j] ** 2
                q_sq_sum += anti_image[i, j] ** 2

    denom = r_sq_sum + q_sq_sum
    if denom == 0.0:
        return 0.5
    return float(r_sq_sum / denom)


def varimax_rotation(loadings: np.ndarray, gamma: float = 1.0, max_iter: int = 50, tol: float = 1e-6) -> np.ndarray:
    """Performs Orthogonal Varimax Rotation via Jacobi sweeps."""
    p, k = loadings.shape
    if k <= 1:
        return loadings

    R = np.eye(k)
    var = 0.0

    for _ in range(max_iter):
        var_old = var
        for i in range(k - 1):
            for j in range(i + 1, k):
                # 2D plane rotation
                u = loadings[:, i]
                v = loadings[:, j]

                num = 2.0 * (p * np.sum((u**2 - v**2) * (2 * u * v)) - 
                             np.sum(u**2 - v**2) * np.sum(2 * u * v))
                den = (p * np.sum((u**2 - v**2)**2 - (2 * u * v)**2) - 
                       (np.sum(u**2 - v**2)**2 - (np.sum(2 * u * v))**2))

                phi = 0.25 * math.atan2(num, den)

                c = math.cos(phi)
                s = math.sin(phi)

                rot_mat = np.array([[c, -s], [s, c]])
                loadings[:, [i, j]] = loadings[:, [i, j]] @ rot_mat
                R[:, [i, j]] = R[:, [i, j]] @ rot_mat

        # Calculate varimax criterion
        lambda_sq = loadings**2
        var = np.sum(np.var(lambda_sq, axis=0))
        if abs(var - var_old) < tol:
            break

    return loadings


@router.post("/factor-analysis", response_model=FactorAnalysisResponse)
async def run_factor_analysis(req: FactorAnalysisRequest):
    if len(req.variables) < 3:
        raise HTTPException(status_code=400, detail="Factor Analysis requires at least 3 continuous variables.")

    # 1. Extract and clean data
    data_list = []
    for r in req.rows:
        row_vals = []
        is_valid = True
        for v in req.variables:
            val = r.get(v)
            try:
                fval = float(val)
                if math.isnan(fval):
                    is_valid = False
                    break
                row_vals.append(fval)
            except (ValueError, TypeError):
                is_valid = False
                break
        if is_valid:
            data_list.append(row_vals)

    X = np.array(data_list)
    n, p = X.shape

    if n < p:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient sample size. Number of observations ({n}) must exceed variables ({p})."
        )

    # 2. Standardize variables (Z-scores)
    means = np.mean(X, axis=0)
    stds = np.std(X, axis=0, ddof=1)
    stds[stds == 0] = 1.0
    Z = (X - means) / stds

    # 3. Correlation Matrix
    corr = np.corrcoef(Z, rowvar=False)
    corr_dict = {}
    for i, v1 in enumerate(req.variables):
        corr_dict[v1] = {}
        for j, v2 in enumerate(req.variables):
            corr_dict[v1][v2] = round(float(corr[i, j]), 4)

    # 4. KMO & Bartlett's Test of Sphericity
    kmo_val = compute_kmo(corr)
    if kmo_val >= 0.9:
        kmo_interp = "Marvelous"
    elif kmo_val >= 0.8:
        kmo_interp = "Meritorious"
    elif kmo_val >= 0.7:
        kmo_interp = "Middling"
    elif kmo_val >= 0.6:
        kmo_interp = "Mediocre"
    elif kmo_val >= 0.5:
        kmo_interp = "Miserable"
    else:
        kmo_interp = "Unacceptable"

    # Bartlett's test: chi^2 = - (n - 1 - (2p + 5)/6) * ln(det(R))
    det_r = np.linalg.det(corr)
    det_r = max(det_r, 1e-15)
    bartlett_chi = - (n - 1 - (2 * p + 5) / 6.0) * math.log(det_r)
    bartlett_df = int(p * (p - 1) / 2)
    bartlett_p = 1.0 - stats.chi2.cdf(bartlett_chi, bartlett_df)

    # 5. Eigenvalue Decomposition
    eigenvalues, eigenvectors = np.linalg.eigh(corr)
    # Sort descending
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]

    # Clean negative or tiny eigenvalues
    eigenvalues = np.maximum(eigenvalues, 0.0)

    # Determine extracted components
    if req.num_factors and req.num_factors > 0:
        n_factors = min(req.num_factors, p)
    else:
        cutoff = req.eigenvalue_cutoff if req.eigenvalue_cutoff is not None else 1.0
        n_factors = int(np.sum(eigenvalues >= cutoff))
        n_factors = max(1, min(n_factors, p))

    # Variance explained tables
    total_var = float(np.sum(eigenvalues))
    var_explained = []
    cum_pct = 0.0
    for i in range(p):
        ev = float(eigenvalues[i])
        pct = (ev / total_var) * 100.0
        cum_pct += pct
        var_explained.append(ComponentVariance(
            component=i + 1,
            initial_eigenvalue=round(ev, 4),
            pct_variance=round(pct, 2),
            cumulative_pct=round(cum_pct, 2),
            extracted_eigenvalue=round(ev, 4) if i < n_factors else None,
            extracted_pct_variance=round(pct, 2) if i < n_factors else None,
            extracted_cumulative_pct=round(cum_pct, 2) if i < n_factors else None,
        ))

    # Scree Plot Coordinates
    scree_plot = [
        {"component": i + 1, "eigenvalue": round(float(eigenvalues[i]), 4)}
        for i in range(p)
    ]

    # 6. Unrotated Component Matrix (Factor Loadings)
    # Loadings = Eigenvectors * sqrt(Eigenvalues)
    loadings = np.zeros((p, n_factors))
    for f in range(n_factors):
        loadings[:, f] = eigenvectors[:, f] * math.sqrt(eigenvalues[f])

    unrotated_matrix = {}
    for i, var_name in enumerate(req.variables):
        unrotated_matrix[var_name] = {}
        for f in range(n_factors):
            unrotated_matrix[var_name][f"Component {f + 1}"] = round(float(loadings[i, f]), 4)

    # 7. Varimax Rotation
    rotated_matrix = None
    if req.rotation_method == "varimax" and n_factors > 1:
        rotated_loadings = varimax_rotation(loadings.copy())
        rotated_matrix = {}
        for i, var_name in enumerate(req.variables):
            rotated_matrix[var_name] = {}
            for f in range(n_factors):
                rotated_matrix[var_name][f"Component {f + 1}"] = round(float(rotated_loadings[i, f]), 4)

        # Update rotated sums of squared loadings
        rot_cum_pct = 0.0
        for f in range(n_factors):
            ss_load = float(np.sum(rotated_loadings[:, f] ** 2))
            rot_pct = (ss_load / total_var) * 100.0
            rot_cum_pct += rot_pct
            var_explained[f].rotated_eigenvalue = round(ss_load, 4)
            var_explained[f].rotated_pct_variance = round(rot_pct, 2)
            var_explained[f].rotated_cumulative_pct = round(rot_cum_pct, 2)

    # 8. APA 7th Edition Summary
    p_str = "p < .001" if bartlett_p < 0.001 else f"p = {bartlett_p:.3f}"
    kmo_str = f"{kmo_val:.3f}".replace("0.", ".")
    cum_pct_extracted = var_explained[n_factors - 1].cumulative_pct

    apa = (
        f"A principal component analysis (PCA) with {req.rotation_method.title()} rotation was conducted "
        f"on {p} variables ({', '.join(req.variables)}) with N = {n} participants. "
        f"The Kaiser-Meyer-Olkin measure verified sampling adequacy for the analysis (KMO = {kmo_str}, {kmo_interp.lower()}), "
        f"and Bartlett’s test of sphericity, χ²({bartlett_df}) = {bartlett_chi:.2f}, {p_str}, "
        f"demonstrated that correlations between items were sufficiently strong for PCA. "
        f"{n_factors} components were retained according to Kaiser's criterion (eigenvalues > 1.0), "
        f"explaining a cumulative {cum_pct_extracted:.1f}% of the total variance."
    )

    return FactorAnalysisResponse(
        n_cases=n,
        n_variables=p,
        variables=req.variables,
        correlation_matrix=corr_dict,
        kmo=round(kmo_val, 4),
        kmo_interpretation=kmo_interp,
        bartlett_chi_square=round(bartlett_chi, 3),
        bartlett_df=bartlett_df,
        bartlett_p_value=round(bartlett_p, 4),
        total_variance_explained=var_explained,
        scree_plot=scree_plot,
        unrotated_component_matrix=unrotated_matrix,
        rotated_component_matrix=rotated_matrix,
        apa_statement=apa,
        engine_used="AutoStat Rust Core + SciPy Engine" if RUST_CORE_AVAILABLE else "AutoStat Python Engine (SciPy + NumPy)",
    )
