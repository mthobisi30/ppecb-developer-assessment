using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class ProductsControllerQueryTests
{
    [Fact]
    public async Task GetPage_ProductsExist_ReturnsPaginationMetadata()
    {
        var product = CreateDetails();
        var page = new ProductPage([product], 2, 10, 11, 2);
        var controller = new ProductsController(new StubProductService(page, product));

        var response = await controller.GetPage(2, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<ProductPageResponse>(okResult.Value);
        Assert.Single(body.Items);
        Assert.Equal(2, body.Page);
        Assert.Equal(10, body.PageSize);
        Assert.Equal(11, body.TotalCount);
        Assert.Equal(2, body.TotalPages);
    }

    [Fact]
    public async Task GetById_MissingProduct_ReturnsNotFoundProblem()
    {
        var page = new ProductPage([], 1, 10, 0, 0);
        var controller = new ProductsController(new StubProductService(page, null));

        var response = await controller.GetById(1, CancellationToken.None);

        var result = Assert.IsType<NotFoundObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    private static ProductDetails CreateDetails()
    {
        return new ProductDetails(
            1,
            "202608-001",
            "Apples",
            "Fresh apples",
            24.99m,
            2,
            "Fruit",
            null,
            [1, 2, 3]);
    }

    private sealed class StubProductService(
        ProductPage page,
        ProductDetails? product) : IProductService
    {
        public Task<ProductPage> GetPageAsync(
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(page);
        }

        public Task<ProductDetails?> GetByIdAsync(
            int productId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(product);
        }
    }
}
