use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReliabilityResult {
    pub cronbach_alpha: f64,
    pub n_items: usize,
}

// Stubs for reliability metrics (Cronbach's alpha, scale statistics)
