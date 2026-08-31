namespace PpecbAssessment.Application.Products;

public interface IProductService
{
    Task<ProductPage> GetPageAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<ProductDetails?> GetByIdAsync(
        int productId,
        CancellationToken cancellationToken = default);
}
