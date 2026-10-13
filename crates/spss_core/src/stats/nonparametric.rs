use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MannWhitneyResult {
    pub test_name: String,
    pub u_statistic: f64,
    pub p_value: f64,
}

// Stubs for non-parametric tests (Mann-Whitney, Kruskal-Wallis, Spearman)
pub fn compute_mann_whitney_stub(_g1: &[f64], _g2: &[f64]) -> Result<MannWhitneyResult, String> {
    Ok(MannWhitneyResult {
        test_name: "Mann-Whitney U Test (Placeholder)".to_string(),
        u_statistic: 0.0,
        p_value: 0.05,
    })
}
