using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using PpecbAssessment.Api.Contracts.Products;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products")]
public sealed class ProductSpreadsheetsController(
    IProductSpreadsheetService spreadsheetService) : ControllerBase
{
    private const long MaximumFileSize = 10 * 1024 * 1024;
    private const long MaximumRequestSize = MaximumFileSize + (64 * 1024);
    private const string ExcelContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumRequestSize)]
    [ProducesResponseType<ProductImportResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductImportResponse>> Import(
        [FromForm] ImportProductsRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsValidUpload(request.File))
        {
            ModelState.AddModelError(
                nameof(request.File),
                "Upload a valid .xlsx file no larger than 10 MB.");
            return ValidationFailure(ModelState, StatusCodes.Status400BadRequest);
        }

        await using var content = request.File!.OpenReadStream();
        var result = await spreadsheetService.ImportAsync(content, cancellationToken);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(
                    $"Rows[{error.RowNumber}].{error.Field}",
                    error.Message);
            }

            var statusCode = result.CodeLimitReached
                ? StatusCodes.Status409Conflict
                : StatusCodes.Status400BadRequest;
            return ValidationFailure(ModelState, statusCode);
        }

        return Ok(new ProductImportResponse(result.ImportedCount));
    }

    [HttpGet("export")]
    [ProducesResponseType<FileContentResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Export(CancellationToken cancellationToken)
    {
        var content = await spreadsheetService.ExportAsync(cancellationToken);
        return File(content, ExcelContentType, "products.xlsx");
    }

    private ObjectResult ValidationFailure(
        ModelStateDictionary modelState,
        int statusCode)
    {
        return StatusCode(statusCode, new ValidationProblemDetails(modelState)
        {
            Status = statusCode,
            Title = statusCode == StatusCodes.Status409Conflict
                ? "Product import conflict."
                : "Product import validation failed."
        });
    }

    private static bool IsValidUpload(IFormFile? file)
    {
        return file is not null
            && file.Length is > 0 and <= MaximumFileSize
            && string.Equals(
                Path.GetExtension(file.FileName),
                ".xlsx",
                StringComparison.OrdinalIgnoreCase);
    }
}
