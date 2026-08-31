namespace PpecbAssessment.Application.Products;

public interface IProductSpreadsheetService
{
    Task<ProductImportResult> ImportAsync(
        Stream content,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportAsync(CancellationToken cancellationToken = default);
}
