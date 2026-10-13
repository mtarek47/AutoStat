use crate::stats::parametric::WelchTTestResult;

pub fn format_welch_t_apa(result: &WelchTTestResult) -> String {
    format!(
        "Welch's t({:.2}) = {:.3}, p = {:.4}, Cohen's d = {:.2}.",
        result.degrees_of_freedom,
        result.t_statistic,
        result.p_value,
        result.cohens_d
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_welch_t_apa() {
        let res = WelchTTestResult {
            test_name: "Welch's Independent Samples T-Test".into(),
            mean_1: 22.0,
            mean_2: 12.0,
            t_statistic: 4.1234,
            degrees_of_freedom: 7.891,
            p_value: 0.0035,
            cohens_d: 1.25,
        };
        let formatted = format_welch_t_apa(&res);
        assert_eq!(formatted, "Welch's t(7.89) = 4.123, p = 0.0035, Cohen's d = 1.25.");
    }
}
