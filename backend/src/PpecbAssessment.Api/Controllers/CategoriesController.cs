using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Categories;
using PpecbAssessment.Application.Categories;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/categories")]
public sealed class CategoriesController(ICategoryService categoryService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var categories = await categoryService.GetAllAsync(cancellationToken);
        return Ok(categories.Select(Map).ToList());
    }

    [HttpGet("{categoryId:int}")]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> GetById(
        int categoryId,
        CancellationToken cancellationToken)
    {
        var category = await categoryService.GetByIdAsync(categoryId, cancellationToken);

        return category is null
            ? NotFoundProblem()
            : Ok(Map(category));
    }

    [HttpPost]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Create(
        CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.CreateAsync(
            request.Name,
            request.CategoryCode,
            request.IsActive,
            cancellationToken);

        if (!result.Succeeded)
        {
            return ConflictProblem("A category with this code already exists.");
        }

        var response = Map(result.Category!);
        return CreatedAtAction(nameof(GetById), new { categoryId = response.CategoryId }, response);
    }

    [HttpPut("{categoryId:int}")]
    [ProducesResponseType<CategoryResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Update(
        int categoryId,
        UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        byte[] rowVersion;

        try
        {
            rowVersion = Convert.FromBase64String(request.RowVersion);
        }
        catch (FormatException)
        {
            ModelState.AddModelError(nameof(request.RowVersion), "RowVersion must be valid Base64.");
            return BadRequest(new ValidationProblemDetails(ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Category validation failed."
            });
        }

        var result = await categoryService.UpdateAsync(
            categoryId,
            request.Name,
            request.CategoryCode,
            request.IsActive,
            rowVersion,
            cancellationToken);

        return result.Failure switch
        {
            CategoryFailureKind.None => Ok(Map(result.Category!)),
            CategoryFailureKind.NotFound => NotFoundProblem(),
            CategoryFailureKind.DuplicateCode => ConflictProblem(
                "A category with this code already exists."),
            CategoryFailureKind.ConcurrencyConflict => ConflictProblem(
                "The category was changed by another request. Reload it and try again."),
            _ => throw new InvalidOperationException("Unexpected category update result.")
        };
    }

    private ActionResult<CategoryResponse> NotFoundProblem()
    {
        return NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Category not found."
        });
    }

    private ActionResult<CategoryResponse> ConflictProblem(string title)
    {
        return Conflict(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = title
        });
    }

    private static CategoryResponse Map(CategoryDetails category)
    {
        return new CategoryResponse(
            category.CategoryId,
            category.Name,
            category.CategoryCode,
            category.IsActive,
            Convert.ToBase64String(category.RowVersion));
    }
}
