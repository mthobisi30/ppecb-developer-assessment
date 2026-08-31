namespace PpecbAssessment.Api.Contracts.Categories;

public sealed record CategoryResponse(
    int CategoryId,
    string Name,
    string CategoryCode,
    bool IsActive,
    string RowVersion);
