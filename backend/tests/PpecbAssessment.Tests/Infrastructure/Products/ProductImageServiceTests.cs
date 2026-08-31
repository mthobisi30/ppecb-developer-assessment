using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;
using PpecbAssessment.Infrastructure.Products;

namespace PpecbAssessment.Tests.Infrastructure.Products;

public sealed class ProductImageServiceTests
{
    [Fact]
    public async Task UploadAsync_OwnedProduct_ReplacesImageAndUpdatesAuditFields()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory("owner-one");
        var product = CreateProduct(category);
        product.ImagePath = "/uploads/products/old.jpg";
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();
        var storage = new StubImageStorage();
        var utcNow = new DateTimeOffset(2026, 8, 31, 10, 30, 0, TimeSpan.Zero);
        var service = new ProductImageService(
            dbContext,
            new StubCurrentUser("owner-one"),
            storage,
            new FixedTimeProvider(utcNow));

        var result = await service.UploadAsync(1, new MemoryStream([1, 2, 3]), ".png");

        Assert.True(result.Succeeded);
        Assert.Equal(".png", storage.SavedExtension);
        Assert.Contains("/uploads/products/old.jpg", storage.DeletedPaths);
        Assert.Equal("/uploads/products/new.png", result.Product!.ImagePath);
        Assert.Equal("owner-one", product.UpdatedByUserId);
        Assert.Equal(utcNow.UtcDateTime, product.UpdatedDateUtc);
    }

    [Fact]
    public async Task UploadAsync_ProductOwnedByAnotherUser_ReturnsNotFoundWithoutSaving()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory("owner-two");
        dbContext.Products.Add(CreateProduct(category));
        await dbContext.SaveChangesAsync();
        var storage = new StubImageStorage();
        var service = new ProductImageService(
            dbContext,
            new StubCurrentUser("owner-one"),
            storage,
            TimeProvider.System);

        var result = await service.UploadAsync(1, new MemoryStream([1, 2, 3]), ".png");

        Assert.Equal(ProductFailureKind.NotFound, result.Failure);
        Assert.Null(storage.SavedExtension);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static Category CreateCategory(string ownerUserId)
    {
        return new Category
        {
            CategoryId = 1,
            OwnerUserId = ownerUserId,
            Name = "Fruit",
            CategoryCode = "FRT001",
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = DateTime.UtcNow
        };
    }

    private static Product CreateProduct(Category category)
    {
        return new Product
        {
            ProductId = 1,
            CategoryId = category.CategoryId,
            ProductCode = "202608-001",
            Name = "Apples",
            Price = 24.99m,
            CreatedByUserId = category.OwnerUserId,
            CreatedDateUtc = DateTime.UtcNow,
            Category = category
        };
    }

    private sealed record StubCurrentUser(string UserId) : ICurrentUser
    {
        public bool IsAuthenticated => true;

        string? ICurrentUser.UserId => UserId;

        public string? Email => "person@example.com";
    }

    private sealed class StubImageStorage : IProductImageStorage
    {
        public string? SavedExtension { get; private set; }

        public List<string> DeletedPaths { get; } = [];

        public Task<string> SaveAsync(
            Stream content,
            string fileExtension,
            CancellationToken cancellationToken = default)
        {
            SavedExtension = fileExtension;
            return Task.FromResult($"/uploads/products/new{fileExtension}");
        }

        public Task TryDeleteAsync(
            string? imagePath,
            CancellationToken cancellationToken = default)
        {
            if (imagePath is not null)
            {
                DeletedPaths.Add(imagePath);
            }

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
