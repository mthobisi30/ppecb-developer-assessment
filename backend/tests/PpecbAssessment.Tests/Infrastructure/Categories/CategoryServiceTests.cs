using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Categories;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Categories;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Tests.Infrastructure.Categories;

public sealed class CategoryServiceTests
{
    private static readonly DateTimeOffset FixedUtcNow =
        new(2026, 8, 31, 10, 30, 0, TimeSpan.Zero);

    [Fact]
    public async Task GetAllAsync_MultipleOwners_ReturnsCurrentUsersCategories()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.AddRange(
            CreateCategory(1, "owner-one", "Vegetables", "VEG001", false),
            CreateCategory(2, "owner-two", "Fruit", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var categories = await service.GetAllAsync();

        var category = Assert.Single(categories);
        Assert.Equal("VEG001", category.CategoryCode);
        Assert.False(category.IsActive);
    }

    [Fact]
    public async Task GetByIdAsync_CategoryOwnedByAnotherUser_ReturnsNull()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-two", "Fruit", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var category = await service.GetByIdAsync(1);

        Assert.Null(category);
    }

    [Fact]
    public async Task CreateAsync_UniqueCode_CreatesOwnedCategoryWithAuditFields()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext, "owner-one");

        var result = await service.CreateAsync("  Fruit  ", "FRT001", true);

        Assert.True(result.Succeeded);
        var category = await dbContext.Categories.SingleAsync();
        Assert.Equal("owner-one", category.OwnerUserId);
        Assert.Equal("Fruit", category.Name);
        Assert.Equal("owner-one", category.CreatedByUserId);
        Assert.Equal(FixedUtcNow.UtcDateTime, category.CreatedDateUtc);
    }

    [Fact]
    public async Task CreateAsync_DuplicateCodeForOwner_ReturnsConflict()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", "Fruit", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var result = await service.CreateAsync("Other fruit", "FRT001", true);

        Assert.Equal(CategoryFailureKind.DuplicateCode, result.Failure);
        Assert.Null(result.Category);
    }

    [Fact]
    public async Task UpdateAsync_OwnedCategory_UpdatesCategoryAndAuditFields()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", "Fruit", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var result = await service.UpdateAsync(1, "Citrus", "CIT001", false, []);

        Assert.True(result.Succeeded);
        var category = await dbContext.Categories.SingleAsync();
        Assert.Equal("Citrus", category.Name);
        Assert.Equal("CIT001", category.CategoryCode);
        Assert.False(category.IsActive);
        Assert.Equal("owner-one", category.UpdatedByUserId);
        Assert.Equal(FixedUtcNow.UtcDateTime, category.UpdatedDateUtc);
    }

    [Fact]
    public async Task UpdateAsync_CategoryOwnedByAnotherUser_ReturnsNotFound()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-two", "Fruit", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var result = await service.UpdateAsync(1, "Citrus", "CIT001", true, []);

        Assert.Equal(CategoryFailureKind.NotFound, result.Failure);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static CategoryService CreateService(
        ApplicationDbContext dbContext,
        string userId)
    {
        return new CategoryService(
            dbContext,
            new StubCurrentUser(userId),
            new FixedTimeProvider(FixedUtcNow));
    }

    private static Category CreateCategory(
        int categoryId,
        string ownerUserId,
        string name,
        string categoryCode,
        bool isActive)
    {
        return new Category
        {
            CategoryId = categoryId,
            OwnerUserId = ownerUserId,
            Name = name,
            CategoryCode = categoryCode,
            IsActive = isActive,
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = FixedUtcNow.UtcDateTime
        };
    }

    private sealed record StubCurrentUser(string UserId) : ICurrentUser
    {
        public bool IsAuthenticated => true;

        string? ICurrentUser.UserId => UserId;

        public string? Email => "person@example.com";
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow()
        {
            return utcNow;
        }
    }
}
