use thiserror::Error;

#[derive(Error, Debug)]
pub enum SpssError {
    #[error("Computation error: {0}")]
    ComputationError(String),

    #[error("Invalid input data: {0}")]
    InvalidInput(String),

    #[error("Statistical distribution error: {0}")]
    DistributionError(String),
}
