using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Api.Validation;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products")]
public sealed class ProductImagesController(IProductImageService productImageService)
    : ControllerBase
{
    [HttpPost("{productId:int}/image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ProductImageValidator.MaximumRequestSize)]
    [ProducesResponseType<ProductResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductResponse>> Upload(
        int productId,
        [FromForm] UploadProductImageRequest request,
        CancellationToken cancellationToken)
    {
        var fileExtension = request.File is null
            ? null
            : await ProductImageValidator.GetFileExtensionAsync(
                request.File,
                cancellationToken);

        if (fileExtension is null)
        {
            ModelState.AddModelError(
                nameof(request.File),
                "Upload a JPG, PNG, WebP, GIF, or BMP image no larger than 5 MB.");
            return BadRequest(new ValidationProblemDetails(ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Image validation failed."
            });
        }

        await using var content = request.File!.OpenReadStream();
        var result = await productImageService.UploadAsync(
            productId,
            content,
            fileExtension,
            cancellationToken);

        return result.Failure switch
        {
            ProductFailureKind.None => Ok(Map(result.Product!)),
            ProductFailureKind.NotFound => NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Product not found."
            }),
            ProductFailureKind.ConcurrencyConflict => Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "The product was changed by another request. Reload it and try again."
            }),
            _ => throw new InvalidOperationException("Unexpected product image result.")
        };
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
