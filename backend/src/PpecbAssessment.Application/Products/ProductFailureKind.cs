namespace PpecbAssessment.Application.Products;

public enum ProductFailureKind
{
    None,
    NotFound,
    CategoryUnavailable,
    CodeLimitReached,
    ConcurrencyConflict
}
