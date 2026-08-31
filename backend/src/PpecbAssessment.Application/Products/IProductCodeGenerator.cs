namespace PpecbAssessment.Application.Products;

public interface IProductCodeGenerator
{
    Task<ProductCodeGenerationResult> GenerateAsync(
        CancellationToken cancellationToken = default);
}
