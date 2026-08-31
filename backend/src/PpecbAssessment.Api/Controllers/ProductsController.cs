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

    [HttpPost]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Create(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var result = await productService.CreateAsync(
            request.Name,
            request.Description,
            request.Price,
            request.CategoryId,
            cancellationToken);

        if (result.Failure == ProductFailureKind.CategoryUnavailable)
        {
            return CategoryUnavailableProblem();
        }

        if (result.Failure == ProductFailureKind.CodeLimitReached)
        {
            return ConflictProblem(
                "The monthly product-code limit has been reached. Try again next month.");
        }

        var response = Map(result.Product!);
        return CreatedAtAction(nameof(GetById), new { productId = response.ProductId }, response);
    }

    [HttpPut("{productId:int}")]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Update(
        int productId,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryParseRowVersion(request.RowVersion, out var rowVersion))
        {
            return RowVersionValidationProblem();
        }

        var result = await productService.UpdateAsync(
            productId,
            request.Name,
            request.Description,
            request.Price,
            request.CategoryId,
            rowVersion,
            cancellationToken);

        return result.Failure switch
        {
            ProductFailureKind.None => Ok(Map(result.Product!)),
            ProductFailureKind.NotFound => NotFoundProblem(),
            ProductFailureKind.CategoryUnavailable => CategoryUnavailableProblem(),
            ProductFailureKind.ConcurrencyConflict => ConflictProblem(
                "The product was changed by another request. Reload it and try again."),
            _ => throw new InvalidOperationException("Unexpected product update result.")
        };
    }

    [HttpDelete("{productId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(
        int productId,
        CancellationToken cancellationToken)
    {
        var result = await productService.DeleteAsync(productId, cancellationToken);

        return result.Failure switch
        {
            ProductFailureKind.None => NoContent(),
            ProductFailureKind.NotFound => NotFoundProblem(),
            ProductFailureKind.ConcurrencyConflict => ConflictProblem(
                "The product was changed by another request. Reload it and try again."),
            _ => throw new InvalidOperationException("Unexpected product delete result.")
        };
    }

    private BadRequestObjectResult CategoryUnavailableProblem()
    {
        ModelState.AddModelError(
            nameof(CreateProductRequest.CategoryId),
            "Select an active category that belongs to the current user.");
        return BadRequest(new ValidationProblemDetails(ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Product validation failed."
        });
    }

    private BadRequestObjectResult RowVersionValidationProblem()
    {
        ModelState.AddModelError(
            nameof(UpdateProductRequest.RowVersion),
            "RowVersion must be valid Base64.");
        return BadRequest(new ValidationProblemDetails(ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Product validation failed."
        });
    }

    private NotFoundObjectResult NotFoundProblem()
    {
        return NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Product not found."
        });
    }

    private ConflictObjectResult ConflictProblem(string title)
    {
        return Conflict(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = title
        });
    }

    private static bool TryParseRowVersion(string value, out byte[] rowVersion)
    {
        try
        {
            rowVersion = Convert.FromBase64String(value);
            return true;
        }
        catch (FormatException)
        {
            rowVersion = [];
            return false;
        }
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
