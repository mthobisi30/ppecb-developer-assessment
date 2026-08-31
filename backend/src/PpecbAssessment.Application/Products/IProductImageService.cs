namespace PpecbAssessment.Application.Products;

public interface IProductImageService
{
    Task<ProductImageResult> UploadAsync(
        int productId,
        Stream content,
        string fileExtension,
        CancellationToken cancellationToken = default);
}
