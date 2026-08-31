using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class ProductImagesControllerTests
{
    [Fact]
    public async Task Upload_ValidPng_ReturnsUpdatedProduct()
    {
        var details = CreateDetails();
        var service = new StubProductImageService(
            new ProductImageResult(details, ProductFailureKind.None));
        var controller = new ProductImagesController(service);
        var file = CreateFile(
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "image.png");

        var response = await controller.Upload(
            1,
            new UploadProductImageRequest { File = file },
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<ProductResponse>(okResult.Value);
        Assert.Equal("/uploads/products/image.png", body.ImagePath);
        Assert.Equal(".png", service.FileExtension);
    }

    [Fact]
    public async Task Upload_UnsupportedFile_ReturnsValidationProblem()
    {
        var controller = new ProductImagesController(new StubProductImageService());
        var file = CreateFile("plain text"u8.ToArray(), "file.txt");

        var response = await controller.Upload(
            1,
            new UploadProductImageRequest { File = file },
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Contains(nameof(UploadProductImageRequest.File), problem.Errors.Keys);
    }

    private static FormFile CreateFile(byte[] content, string fileName)
    {
        return new FormFile(new MemoryStream(content), 0, content.Length, "file", fileName);
    }

    private static ProductDetails CreateDetails()
    {
        return new ProductDetails(
            1,
            "202608-001",
            "Apples",
            null,
            24.99m,
            1,
            "Fruit",
            "/uploads/products/image.png",
            [1, 2, 3]);
    }

    private sealed class StubProductImageService(ProductImageResult? result = null)
        : IProductImageService
    {
        public string? FileExtension { get; private set; }

        public Task<ProductImageResult> UploadAsync(
            int productId,
            Stream content,
            string fileExtension,
            CancellationToken cancellationToken = default)
        {
            FileExtension = fileExtension;
            return Task.FromResult(
                result
                ?? new ProductImageResult(null, ProductFailureKind.NotFound));
        }
    }
}
