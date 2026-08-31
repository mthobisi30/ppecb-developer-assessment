using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Categories;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Categories;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class CategoriesControllerTests
{
    [Fact]
    public async Task GetById_OwnedCategory_ReturnsCategory()
    {
        var category = CreateDetails();
        var controller = new CategoriesController(new StubCategoryService(category: category));

        var response = await controller.GetById(1, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<CategoryResponse>(okResult.Value);
        Assert.Equal("FRT001", body.CategoryCode);
        Assert.Equal(Convert.ToBase64String([1, 2, 3]), body.RowVersion);
    }

    [Fact]
    public async Task GetById_MissingCategory_ReturnsNotFoundProblem()
    {
        var controller = new CategoriesController(new StubCategoryService());

        var response = await controller.GetById(1, CancellationToken.None);

        var result = Assert.IsType<NotFoundObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    [Fact]
    public async Task Create_DuplicateCode_ReturnsConflictProblem()
    {
        var writeResult = new CategoryWriteResult(null, CategoryFailureKind.DuplicateCode);
        var controller = new CategoriesController(
            new StubCategoryService(writeResult: writeResult));

        var response = await controller.Create(
            new CreateCategoryRequest
            {
                Name = "Fruit",
                CategoryCode = "FRT001"
            },
            CancellationToken.None);

        var result = Assert.IsType<ConflictObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
    }

    [Fact]
    public async Task Update_InvalidRowVersion_ReturnsValidationProblem()
    {
        var controller = new CategoriesController(new StubCategoryService());

        var response = await controller.Update(
            1,
            new UpdateCategoryRequest
            {
                Name = "Fruit",
                CategoryCode = "FRT001",
                IsActive = true,
                RowVersion = "not-base64"
            },
            CancellationToken.None);

        var result = Assert.IsType<BadRequestObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
        Assert.Contains(nameof(UpdateCategoryRequest.RowVersion), problem.Errors.Keys);
    }

    private static CategoryDetails CreateDetails()
    {
        return new CategoryDetails(1, "Fruit", "FRT001", true, [1, 2, 3]);
    }

    private sealed class StubCategoryService(
        CategoryDetails? category = null,
        CategoryWriteResult? writeResult = null) : ICategoryService
    {
        public Task<IReadOnlyList<CategoryDetails>> GetAllAsync(
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<CategoryDetails> categories = category is null ? [] : [category];
            return Task.FromResult(categories);
        }

        public Task<CategoryDetails?> GetByIdAsync(
            int categoryId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(category);
        }

        public Task<CategoryWriteResult> CreateAsync(
            string name,
            string categoryCode,
            bool isActive,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                writeResult
                ?? new CategoryWriteResult(CreateDetails(), CategoryFailureKind.None));
        }

        public Task<CategoryWriteResult> UpdateAsync(
            int categoryId,
            string name,
            string categoryCode,
            bool isActive,
            byte[] expectedRowVersion,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(
                writeResult
                ?? new CategoryWriteResult(CreateDetails(), CategoryFailureKind.None));
        }
    }
}
