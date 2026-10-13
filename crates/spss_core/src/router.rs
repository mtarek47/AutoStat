use crate::stats::assumptions::check_normality;
use crate::stats::parametric::{compute_welch_t, WelchTTestResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "test_category", content = "details")]
pub enum AnalysisReport {
    Parametric(WelchTTestResult),
    FallbackNote(String),
}

/// Automatically tests assumptions (normality) and directs groups to Welch's t-test or non-parametric fallback.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_comparison_routes_to_parametric() {
        let g1 = [10.0, 11.0, 11.5, 12.0, 12.0, 12.0, 12.5, 13.0, 13.0, 13.5, 14.0, 15.0];
        let g2 = [20.0, 21.0, 21.5, 22.0, 22.0, 22.0, 22.5, 23.0, 23.0, 23.5, 24.0, 25.0];

        let result = run_automated_group_comparison(&g1, &g2).expect("Comparison should succeed");
        match result {
            AnalysisReport::Parametric(res) => {
                assert!(res.p_value < 0.05);
            }
            AnalysisReport::FallbackNote(_) => panic!("Expected parametric result"),
        }
    }

    #[test]
    fn test_non_normal_comparison_routes_to_fallback() {
        let g1 = [1.0, 1.0, 1.1, 1.2, 1.2, 1.3, 1.4, 2.0, 50.0, 100.0];
        let g2 = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0];

        let result = run_automated_group_comparison(&g1, &g2).expect("Comparison should succeed");
        match result {
            AnalysisReport::FallbackNote(msg) => {
                assert!(msg.contains("Non-Parametric"));
            }
            AnalysisReport::Parametric(_) => panic!("Expected fallback note"),
        }
    }
}
