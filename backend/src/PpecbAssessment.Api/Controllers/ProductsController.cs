using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products")]
public sealed class ProductsController(IProductService productService) : ControllerBase
{
    private const int PageSize = 10;

    [HttpGet]
    [ProducesResponseType<ProductPageResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductPageResponse>> GetPage(
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        CancellationToken cancellationToken = default)
    {
        var result = await productService.GetPageAsync(page, PageSize, cancellationToken);
        return Ok(new ProductPageResponse(
            result.Items.Select(Map).ToList(),
            result.Page,
            result.PageSize,
            result.TotalCount,
            result.TotalPages));
    }

    [HttpGet("{productId:int}")]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductResponse>> GetById(
        int productId,
        CancellationToken cancellationToken)
    {
        var product = await productService.GetByIdAsync(productId, cancellationToken);

        if (product is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Product not found."
            });
        }

        return Ok(Map(product));
    }

    private static ProductResponse Map(ProductDetails product)
    {
        return new ProductResponse(
            product.ProductId,
            product.ProductCode,
            product.Name,
            product.Description,
            product.Price,
            product.CategoryId,
            product.CategoryName,
            product.ImagePath,
            Convert.ToBase64String(product.RowVersion));
    }
}
