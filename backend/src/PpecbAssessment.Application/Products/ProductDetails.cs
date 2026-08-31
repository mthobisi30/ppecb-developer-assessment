namespace PpecbAssessment.Application.Products;

public sealed record ProductDetails(
    int ProductId,
    string ProductCode,
    string Name,
    string? Description,
    decimal Price,
    int CategoryId,
    string CategoryName,
    string? ImagePath,
    byte[] RowVersion);
