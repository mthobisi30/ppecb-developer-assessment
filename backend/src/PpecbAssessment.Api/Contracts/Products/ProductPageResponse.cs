namespace PpecbAssessment.Api.Contracts.Products;

public sealed record ProductPageResponse(
    IReadOnlyList<ProductResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
