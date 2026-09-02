namespace PpecbAssessment.Application.Products;

public interface IProductService
{
    Task<ProductPage> GetPageAsync(
        int page,
        int pageSize,
        ProductSortField sortBy,
        ProductSortDirection sortDirection,
        CancellationToken cancellationToken = default);

    Task<ProductDetails?> GetByIdAsync(
        int productId,
        CancellationToken cancellationToken = default);

    Task<ProductWriteResult> CreateAsync(
        string name,
        string? description,
        decimal price,
        int categoryId,
        CancellationToken cancellationToken = default);

    Task<ProductWriteResult> UpdateAsync(
        int productId,
        string name,
        string? description,
        decimal price,
        int categoryId,
        byte[] expectedRowVersion,
        CancellationToken cancellationToken = default);

    Task<ProductDeleteResult> DeleteAsync(
        int productId,
        CancellationToken cancellationToken = default);
}
