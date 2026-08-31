using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class ProductSpreadsheetsControllerTests
{
    [Fact]
    public async Task Import_ValidWorkbook_ReturnsImportedCount()
    {
        var service = new StubSpreadsheetService(
            new ProductImportResult(3, []));
        var controller = new ProductSpreadsheetsController(service);
        var request = new ImportProductsRequest
        {
            File = CreateFile("products.xlsx")
        };

        var response = await controller.Import(request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<ProductImportResponse>(okResult.Value);
        Assert.Equal(3, body.ImportedCount);
    }

    [Fact]
    public async Task Import_InvalidExtension_ReturnsValidationProblem()
    {
        var service = new StubSpreadsheetService();
        var controller = new ProductSpreadsheetsController(service);
        var request = new ImportProductsRequest
        {
            File = CreateFile("products.csv")
        };

        var response = await controller.Import(request, CancellationToken.None);

        var result = Assert.IsType<ObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Contains(nameof(ImportProductsRequest.File), problem.Errors.Keys);
        Assert.False(service.ImportCalled);
    }

    [Fact]
    public async Task Import_CodeLimitReached_ReturnsConflictProblem()
    {
        var importResult = new ProductImportResult(
            0,
            [new ProductImportError(2, "ProductCode", "Monthly limit reached.")],
            CodeLimitReached: true);
        var controller = new ProductSpreadsheetsController(
            new StubSpreadsheetService(importResult));

        var response = await controller.Import(
            new ImportProductsRequest { File = CreateFile("products.xlsx") },
            CancellationToken.None);

        var result = Assert.IsType<ObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
        Assert.Contains("Rows[2].ProductCode", problem.Errors.Keys);
    }

    [Fact]
    public async Task Export_Requested_ReturnsExcelFile()
    {
        var controller = new ProductSpreadsheetsController(
            new StubSpreadsheetService(exportContent: [1, 2, 3]));

        var response = await controller.Export(CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(response);
        Assert.Equal("products.xlsx", file.FileDownloadName);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file.ContentType);
    }

    private static FormFile CreateFile(string fileName)
    {
        var content = new byte[] { 1, 2, 3 };
        return new FormFile(new MemoryStream(content), 0, content.Length, "file", fileName);
    }

    private sealed class StubSpreadsheetService(
        ProductImportResult? importResult = null,
        byte[]? exportContent = null) : IProductSpreadsheetService
    {
        public bool ImportCalled { get; private set; }

        public Task<ProductImportResult> ImportAsync(
            Stream content,
            CancellationToken cancellationToken = default)
        {
            ImportCalled = true;
            return Task.FromResult(
                importResult
                ?? new ProductImportResult(0, []));
        }

        public Task<byte[]> ExportAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(exportContent ?? []);
        }
    }
}
