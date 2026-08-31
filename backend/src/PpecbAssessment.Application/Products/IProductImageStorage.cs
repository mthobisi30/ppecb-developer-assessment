namespace PpecbAssessment.Application.Products;

public interface IProductImageStorage
{
    Task<string> SaveAsync(
        Stream content,
        string fileExtension,
        CancellationToken cancellationToken = default);

    Task TryDeleteAsync(
        string? imagePath,
        CancellationToken cancellationToken = default);
}
