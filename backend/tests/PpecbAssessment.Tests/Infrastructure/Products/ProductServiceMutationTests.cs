using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;
using PpecbAssessment.Infrastructure.Products;

namespace PpecbAssessment.Tests.Infrastructure.Products;

public sealed class ProductServiceMutationTests
{
    private static readonly DateTimeOffset FixedUtcNow =
        new(2026, 8, 31, 10, 30, 0, TimeSpan.Zero);

    [Fact]
    public async Task CreateAsync_ActiveOwnedCategory_CreatesProductWithGeneratedCode()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", true));
        await dbContext.SaveChangesAsync();
        var codeGenerator = new StubProductCodeGenerator("202608-001");
        var service = CreateService(dbContext, "owner-one", codeGenerator);

        var result = await service.CreateAsync("  Apples  ", "  Fresh  ", 24.99m, 1);

        Assert.True(result.Succeeded);
        var product = await dbContext.Products.SingleAsync();
        Assert.Equal("202608-001", product.ProductCode);
        Assert.Equal("Apples", product.Name);
        Assert.Equal("Fresh", product.Description);
        Assert.Equal("owner-one", product.CreatedByUserId);
        Assert.Equal(FixedUtcNow.UtcDateTime, product.CreatedDateUtc);
    }

    [Fact]
    public async Task CreateAsync_InactiveCategory_ReturnsCategoryUnavailable()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", false));
        await dbContext.SaveChangesAsync();
        var codeGenerator = new StubProductCodeGenerator("202608-001");
        var service = CreateService(dbContext, "owner-one", codeGenerator);

        var result = await service.CreateAsync("Apples", null, 24.99m, 1);

        Assert.Equal(ProductFailureKind.CategoryUnavailable, result.Failure);
        Assert.False(codeGenerator.Called);
        Assert.Empty(dbContext.Products);
    }

    [Fact]
    public async Task CreateAsync_MonthlyCodeLimitReached_ReturnsConflict()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", true));
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator(null));

        var result = await service.CreateAsync("Apples", null, 24.99m, 1);

        Assert.Equal(ProductFailureKind.CodeLimitReached, result.Failure);
        Assert.Empty(dbContext.Products);
    }

    [Fact]
    public async Task UpdateAsync_SameInactiveCategory_UpdatesExistingProduct()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory(1, "owner-one", false);
        dbContext.Products.Add(CreateProduct(1, category));
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator("202608-002"));

        var result = await service.UpdateAsync(1, "Pears", null, 30m, 1, []);

        Assert.True(result.Succeeded);
        var product = await dbContext.Products.SingleAsync();
        Assert.Equal("Pears", product.Name);
        Assert.Null(product.Description);
        Assert.Equal("owner-one", product.UpdatedByUserId);
        Assert.Equal(FixedUtcNow.UtcDateTime, product.UpdatedDateUtc);
    }

    [Fact]
    public async Task UpdateAsync_ChangedToInactiveCategory_ReturnsCategoryUnavailable()
    {
        await using var dbContext = CreateDbContext();
        var activeCategory = CreateCategory(1, "owner-one", true);
        var inactiveCategory = CreateCategory(2, "owner-one", false);
        dbContext.Products.Add(CreateProduct(1, activeCategory));
        dbContext.Categories.Add(inactiveCategory);
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator("202608-002"));

        var result = await service.UpdateAsync(1, "Pears", null, 30m, 2, []);

        Assert.Equal(ProductFailureKind.CategoryUnavailable, result.Failure);
    }

    [Fact]
    public async Task DeleteAsync_OwnedProduct_DeletesProduct()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory(1, "owner-one", true);
        var product = CreateProduct(1, category);
        product.ImagePath = "uploads/products/image.jpg";
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();
        var imageStorage = new StubImageStorage();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator("202608-002"),
            imageStorage);

        var result = await service.DeleteAsync(1);

        Assert.True(result.Succeeded);
        Assert.Equal("uploads/products/image.jpg", result.DeletedImagePath);
        Assert.Equal("uploads/products/image.jpg", imageStorage.DeletedImagePath);
        Assert.Empty(dbContext.Products);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static ProductService CreateService(
        ApplicationDbContext dbContext,
        string userId,
        IProductCodeGenerator productCodeGenerator,
        IProductImageStorage? imageStorage = null)
    {
        return new ProductService(
            dbContext,
            new StubCurrentUser(userId),
            productCodeGenerator,
            new FixedTimeProvider(FixedUtcNow),
            imageStorage);
    }

    private static Category CreateCategory(int categoryId, string ownerUserId, bool isActive)
    {
        return new Category
        {
            CategoryId = categoryId,
            OwnerUserId = ownerUserId,
            Name = $"Category {categoryId}",
            CategoryCode = $"CAT{categoryId:D3}",
            IsActive = isActive,
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = FixedUtcNow.UtcDateTime
        };
    }

    private static Product CreateProduct(int productId, Category category)
    {
        return new Product
        {
            ProductId = productId,
            CategoryId = category.CategoryId,
            ProductCode = $"202608-{productId:D3}",
            Name = "Apples",
            Description = "Fresh",
            Price = 24.99m,
            CreatedByUserId = category.OwnerUserId,
            CreatedDateUtc = FixedUtcNow.UtcDateTime,
            Category = category
        };
    }

    private sealed record StubCurrentUser(string UserId) : ICurrentUser
    {
        public bool IsAuthenticated => true;

        string? ICurrentUser.UserId => UserId;

        public string? Email => "person@example.com";
    }

    private sealed class StubProductCodeGenerator(string? productCode) : IProductCodeGenerator
    {
        public bool Called { get; private set; }

        public Task<ProductCodeGenerationResult> GenerateAsync(
            CancellationToken cancellationToken = default)
        {
            Called = true;
            return Task.FromResult(new ProductCodeGenerationResult(productCode));
        }
    }

    private sealed class StubImageStorage : IProductImageStorage
    {
        public string? DeletedImagePath { get; private set; }

        public Task<string> SaveAsync(
            Stream content,
            string fileExtension,
            CancellationToken cancellationToken = default)
        {
            throw new NotSupportedException();
        }

        public Task TryDeleteAsync(
            string? imagePath,
            CancellationToken cancellationToken = default)
        {
            DeletedImagePath = imagePath;
            return Task.CompletedTask;
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow()
        {
            return utcNow;
        }
    }
}
