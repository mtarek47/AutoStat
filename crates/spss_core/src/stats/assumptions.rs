use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalityCheck {
    pub skewness: f64,
    pub kurtosis: f64,
    pub is_normal: bool,
}

/// Computes sample skewness and excess kurtosis to check normality.
/// Conventional SPSS thresholds: skewness within [-1.5, 1.5], excess kurtosis within [-2.0, 2.0].
pub fn check_normality(data: &[f64]) -> NormalityCheck {
    let n = data.len() as f64;
    if n < 4.0 {
        return NormalityCheck {
            skewness: 0.0,
            kurtosis: 0.0,
            is_normal: false,
        };
    }

    let mean = data.iter().sum::<f64>() / n;
    let m2 = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n;
    let m3 = data.iter().map(|x| (x - mean).powi(3)).sum::<f64>() / n;
    let m4 = data.iter().map(|x| (x - mean).powi(4)).sum::<f64>() / n;

    let variance = m2;
    let std_dev = variance.sqrt();

    if std_dev == 0.0 {
        return NormalityCheck {
            skewness: 0.0,
            kurtosis: 0.0,
            is_normal: false,
        };
    }

    let skewness = m3 / std_dev.powi(3);
    let kurtosis = (m4 / std_dev.powi(4)) - 3.0; // Excess kurtosis

    let is_normal = skewness.abs() <= 1.5 && kurtosis.abs() <= 2.0;

    NormalityCheck {
        skewness,
        kurtosis,
        is_normal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_small_sample_size() {
        let data = [1.0, 2.0, 3.0];
        let result = check_normality(&data);
        assert!(!result.is_normal);
    }

    #[test]
    fn test_normal_distribution_like() {
        // Symmetric bell-shaped dataset
        let data = [
            10.0, 11.0, 11.5, 12.0, 12.0, 12.0, 12.5, 13.0, 13.0, 13.5, 14.0, 15.0,
        ];
        let result = check_normality(&data);
        assert!(result.is_normal);
        assert!(result.skewness.abs() <= 1.5);
    }

    #[test]
    fn test_heavy_skew() {
        // Strongly right-skewed data
        let data = [1.0, 1.0, 1.1, 1.2, 1.2, 1.3, 1.4, 2.0, 50.0, 100.0];
        let result = check_normality(&data);
        assert!(!result.is_normal);
        assert!(result.skewness > 1.5);
    }
}
