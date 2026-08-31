namespace PpecbAssessment.Application.Products;

public sealed record ProductPage(
    IReadOnlyList<ProductDetails> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
