using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class ProductsControllerMutationTests
{
    [Fact]
    public async Task Create_ValidProduct_ReturnsCreatedProduct()
    {
        var result = new ProductWriteResult(CreateDetails(), ProductFailureKind.None);
        var controller = new ProductsController(new StubProductService(writeResult: result));

        var response = await controller.Create(CreateRequest(), CancellationToken.None);

        var createdResult = Assert.IsType<CreatedAtActionResult>(response.Result);
        var body = Assert.IsType<ProductResponse>(createdResult.Value);
        Assert.Equal("202608-001", body.ProductCode);
        Assert.Equal(nameof(ProductsController.GetById), createdResult.ActionName);
    }

    [Fact]
    public async Task Create_UnavailableCategory_ReturnsValidationProblem()
    {
        var result = new ProductWriteResult(null, ProductFailureKind.CategoryUnavailable);
        var controller = new ProductsController(new StubProductService(writeResult: result));

        var response = await controller.Create(CreateRequest(), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Contains(nameof(CreateProductRequest.CategoryId), problem.Errors.Keys);
    }

    [Fact]
    public async Task Update_InvalidRowVersion_ReturnsValidationProblem()
    {
        var controller = new ProductsController(new StubProductService());

        var response = await controller.Update(
            1,
            new UpdateProductRequest
            {
                Name = "Apples",
                Price = 24.99m,
                CategoryId = 1,
                RowVersion = "not-base64"
            },
            CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(badRequest.Value);
        Assert.Contains(nameof(UpdateProductRequest.RowVersion), problem.Errors.Keys);
    }

    [Fact]
    public async Task Update_ConcurrencyConflict_ReturnsConflictProblem()
    {
        var result = new ProductWriteResult(null, ProductFailureKind.ConcurrencyConflict);
        var controller = new ProductsController(new StubProductService(writeResult: result));

        var response = await controller.Update(
            1,
            new UpdateProductRequest
            {
                Name = "Apples",
                Price = 24.99m,
                CategoryId = 1,
                RowVersion = Convert.ToBase64String([1, 2, 3])
            },
            CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
    }

    [Fact]
    public async Task Delete_MissingProduct_ReturnsNotFoundProblem()
    {
        var result = new ProductDeleteResult(ProductFailureKind.NotFound, null);
        var controller = new ProductsController(new StubProductService(deleteResult: result));

        var response = await controller.Delete(1, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    private static CreateProductRequest CreateRequest()
    {
        return new CreateProductRequest
        {
            Name = "Apples",
            Description = "Fresh",
            Price = 24.99m,
            CategoryId = 1
        };
    }

    private static ProductDetails CreateDetails()
    {
        return new ProductDetails(
            1,
            "202608-001",
            "Apples",
            "Fresh",
            24.99m,
            1,
            "Fruit",
            null,
            [1, 2, 3]);
    }

    private sealed class StubProductService(
        ProductWriteResult? writeResult = null,
        ProductDeleteResult? deleteResult = null) : IProductService
    {
        public Task<ProductPage> GetPageAsync(
            int page,
            int pageSize,
            ProductSortField sortBy,
            ProductSortDirection sortDirection,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new ProductPage([], page, pageSize, 0, 0));
        }

        public Task<ProductDetails?> GetByIdAsync(
            int productId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<ProductDetails?>(null);
        }

        public Task<ProductWriteResult> CreateAsync(
            string name,
            string? description,
            decimal price,
            int categoryId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                writeResult
                ?? new ProductWriteResult(CreateDetails(), ProductFailureKind.None));
        }

        public Task<ProductWriteResult> UpdateAsync(
            int productId,
            string name,
            string? description,
            decimal price,
            int categoryId,
            byte[] expectedRowVersion,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                writeResult
                ?? new ProductWriteResult(CreateDetails(), ProductFailureKind.None));
        }

        public Task<ProductDeleteResult> DeleteAsync(
            int productId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                deleteResult
                ?? new ProductDeleteResult(ProductFailureKind.None, null));
        }
    }
}
