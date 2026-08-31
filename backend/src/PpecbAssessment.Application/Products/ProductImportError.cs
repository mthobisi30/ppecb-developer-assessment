namespace PpecbAssessment.Application.Products;

public sealed record ProductImportError(
    int RowNumber,
    string Field,
    string Message);
