namespace PpecbAssessment.Application.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDetails>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<CategoryDetails?> GetByIdAsync(
        int categoryId,
        CancellationToken cancellationToken = default);

    Task<CategoryWriteResult> CreateAsync(
        string name,
        string categoryCode,
        bool isActive,
        CancellationToken cancellationToken = default);

    Task<CategoryWriteResult> UpdateAsync(
        int categoryId,
        string name,
        string categoryCode,
        bool isActive,
        byte[] expectedRowVersion,
        CancellationToken cancellationToken = default);
}
