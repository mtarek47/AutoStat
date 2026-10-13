use serde::{Deserialize, Serialize};
use statrs::distribution::{ContinuousCDF, StudentsT};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelchTTestResult {
    pub test_name: String,
    pub mean_1: f64,
    pub mean_2: f64,
    pub t_statistic: f64,
    pub degrees_of_freedom: f64,
    pub p_value: f64,
    pub cohens_d: f64,
}

/// Computes Welch's Independent Samples T-Test (does not assume equal variances)
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
        return Err("Standard error of difference is zero (identical variance and values).".to_string());
    }

    let t_stat = (m1 - m2) / se_diff;

    // Welch-Satterthwaite equation for degrees of freedom
    let term1 = v1 / n1;
    let term2 = v2 / n2;
    let num = (term1 + term2).powi(2);
    let den = (term1.powi(2) / (n1 - 1.0)) + (term2.powi(2) / (n2 - 1.0));
    let df = num / den;

    let dist = StudentsT::new(0.0, 1.0, df).map_err(|e| e.to_string())?;
    let p_val = 2.0 * (1.0 - dist.cdf(t_stat.abs()));

    // Pooled standard deviation for Cohen's d
    let pooled_sd = (((n1 - 1.0) * v1 + (n2 - 1.0) * v2) / (n1 + n2 - 2.0)).sqrt();
    let cohens_d = if pooled_sd > 0.0 {
        (m1 - m2) / pooled_sd
    } else {
        0.0
    };

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_welch_t_basic() {
        let g1 = [20.0, 22.0, 19.0, 24.0, 25.0];
        let g2 = [10.0, 12.0, 11.0, 14.0, 13.0];
        let res = compute_welch_t(&g1, &g2).expect("Welch t-test should succeed");

        assert!(res.mean_1 > res.mean_2);
        assert!(res.t_statistic > 0.0);
        assert!(res.p_value < 0.01);
        assert!(res.cohens_d > 0.0);
    }

    #[test]
    fn test_insufficient_samples() {
        let g1 = [1.0];
        let g2 = [2.0, 3.0];
        assert!(compute_welch_t(&g1, &g2).is_err());
    }
}
