namespace PpecbAssessment.Application.Categories;

public sealed record CategoryDetails(
    int CategoryId,
    string Name,
    string CategoryCode,
    bool IsActive,
    byte[] RowVersion);
