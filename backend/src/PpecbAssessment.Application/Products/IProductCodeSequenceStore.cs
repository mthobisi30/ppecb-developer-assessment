namespace PpecbAssessment.Application.Products;

public interface IProductCodeSequenceStore
{
    Task<short?> GetNextNumberAsync(
        string period,
        CancellationToken cancellationToken = default);
}
