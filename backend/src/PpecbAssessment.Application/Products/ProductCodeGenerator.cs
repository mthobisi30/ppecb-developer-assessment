using System.Globalization;

namespace PpecbAssessment.Application.Products;

public sealed class ProductCodeGenerator(
    IProductCodeSequenceStore sequenceStore,
    TimeProvider timeProvider) : IProductCodeGenerator
{
    public async Task<ProductCodeGenerationResult> GenerateAsync(
        CancellationToken cancellationToken = default)
    {
        var period = timeProvider.GetUtcNow().ToString("yyyyMM", CultureInfo.InvariantCulture);
        var nextNumber = await sequenceStore.GetNextNumberAsync(period, cancellationToken);

        return nextNumber.HasValue
            ? new ProductCodeGenerationResult(
                $"{period}-{nextNumber.Value.ToString("D3", CultureInfo.InvariantCulture)}")
            : new ProductCodeGenerationResult(null);
    }
}
