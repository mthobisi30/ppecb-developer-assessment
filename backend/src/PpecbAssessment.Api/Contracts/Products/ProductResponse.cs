namespace PpecbAssessment.Api.Contracts.Products;

public sealed record ProductResponse(
    int ProductId,
    string ProductCode,
    string Name,
    string? Description,
    decimal Price,
    int CategoryId,
    string CategoryName,
    string? ImagePath,
    string RowVersion);
