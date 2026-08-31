namespace PpecbAssessment.Application.Products;

public sealed record ProductImportResult(
    int ImportedCount,
    IReadOnlyList<ProductImportError> Errors,
    bool CodeLimitReached = false)
{
    public bool Succeeded => Errors.Count == 0 && !CodeLimitReached;
}
