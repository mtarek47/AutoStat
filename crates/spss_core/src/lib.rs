use pyo3::prelude::*;

pub mod error;
pub mod reports;
pub mod router;
pub mod stats;

#[pyfunction]
fn analyze_groups(g1: Vec<f64>, g2: Vec<f64>) -> PyResult<String> {
    match router::run_automated_group_comparison(&g1, &g2) {
        Ok(res) => serde_json::to_string(&res)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string())),
        Err(err) => Err(pyo3::exceptions::PyValueError::new_err(err)),
    }
}

#[pyfunction]
fn check_normality(data: Vec<f64>) -> PyResult<String> {
    let result = stats::assumptions::check_normality(&data);
    serde_json::to_string(&result)
        .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string()))
}

#[pyfunction]
fn compute_welch_t(g1: Vec<f64>, g2: Vec<f64>) -> PyResult<String> {
    match stats::parametric::compute_welch_t(&g1, &g2) {
        Ok(res) => serde_json::to_string(&res)
            .map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e.to_string())),
        Err(err) => Err(pyo3::exceptions::PyValueError::new_err(err)),
    }
}

#[pymodule]
fn spss_core(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(analyze_groups, m)?)?;
    m.add_function(wrap_pyfunction!(check_normality, m)?)?;
    m.add_function(wrap_pyfunction!(compute_welch_t, m)?)?;
    Ok(())
}
