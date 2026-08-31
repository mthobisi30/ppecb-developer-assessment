using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Categories;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Categories;

public sealed class CategoryService(
    ApplicationDbContext dbContext,
    ICurrentUser currentUser,
    TimeProvider timeProvider) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryDetails>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();

        return await dbContext.Categories
            .AsNoTracking()
            .Where(category => category.OwnerUserId == ownerUserId)
            .OrderBy(category => category.Name)
            .ThenBy(category => category.CategoryCode)
            .Select(category => Map(category))
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDetails?> GetByIdAsync(
        int categoryId,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();

        return await dbContext.Categories
            .AsNoTracking()
            .Where(category =>
                category.CategoryId == categoryId
                && category.OwnerUserId == ownerUserId)
            .Select(category => Map(category))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<CategoryWriteResult> CreateAsync(
        string name,
        string categoryCode,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var normalizedCode = categoryCode.Trim();

        if (await CodeExistsAsync(ownerUserId, normalizedCode, null, cancellationToken))
        {
            return Failure(CategoryFailureKind.DuplicateCode);
        }

        var category = new Category
        {
            OwnerUserId = ownerUserId,
            Name = name.Trim(),
            CategoryCode = normalizedCode,
            IsActive = isActive,
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        dbContext.Categories.Add(category);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return Success(category);
        }
        catch (DbUpdateException)
        {
            return Failure(CategoryFailureKind.DuplicateCode);
        }
    }

    public async Task<CategoryWriteResult> UpdateAsync(
        int categoryId,
        string name,
        string categoryCode,
        bool isActive,
        byte[] expectedRowVersion,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var category = await dbContext.Categories.SingleOrDefaultAsync(
            candidate =>
                candidate.CategoryId == categoryId
                && candidate.OwnerUserId == ownerUserId,
            cancellationToken);

        if (category is null)
        {
            return Failure(CategoryFailureKind.NotFound);
        }

        var normalizedCode = categoryCode.Trim();
        if (await CodeExistsAsync(ownerUserId, normalizedCode, categoryId, cancellationToken))
        {
            return Failure(CategoryFailureKind.DuplicateCode);
        }

        dbContext.Entry(category)
            .Property(candidate => candidate.RowVersion)
            .OriginalValue = expectedRowVersion;

        category.Name = name.Trim();
        category.CategoryCode = normalizedCode;
        category.IsActive = isActive;
        category.UpdatedByUserId = ownerUserId;
        category.UpdatedDateUtc = timeProvider.GetUtcNow().UtcDateTime;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return Success(category);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Failure(CategoryFailureKind.ConcurrencyConflict);
        }
        catch (DbUpdateException)
        {
            return Failure(CategoryFailureKind.DuplicateCode);
        }
    }

    private Task<bool> CodeExistsAsync(
        string ownerUserId,
        string categoryCode,
        int? excludedCategoryId,
        CancellationToken cancellationToken)
    {
        return dbContext.Categories.AnyAsync(
            category =>
                category.OwnerUserId == ownerUserId
                && category.CategoryCode == categoryCode
                && (!excludedCategoryId.HasValue
                    || category.CategoryId != excludedCategoryId.Value),
            cancellationToken);
    }

    private string GetOwnerUserId()
    {
        return currentUser.UserId
            ?? throw new InvalidOperationException("An authenticated user is required.");
    }

    private static CategoryDetails Map(Category category)
    {
        return new CategoryDetails(
            category.CategoryId,
            category.Name,
            category.CategoryCode,
            category.IsActive,
            category.RowVersion);
    }

    private static CategoryWriteResult Success(Category category)
    {
        return new CategoryWriteResult(Map(category), CategoryFailureKind.None);
    }

    private static CategoryWriteResult Failure(CategoryFailureKind failure)
    {
        return new CategoryWriteResult(null, failure);
    }
}
