using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;
using PpecbAssessment.Infrastructure.Products;

namespace PpecbAssessment.Tests.Infrastructure.Products;

public sealed class ProductServiceQueryTests
{
    [Fact]
    public async Task GetPageAsync_MultiplePages_ReturnsOwnedRequestedPage()
    {
        await using var dbContext = CreateDbContext();
        var ownedCategory = CreateCategory(1, "owner-one", "Fruit");
        var otherCategory = CreateCategory(2, "owner-two", "Vegetables");
        dbContext.Products.AddRange(
            Enumerable.Range(1, 12)
                .Select(index => CreateProduct(index, $"Product {index:D2}", ownedCategory)));
        dbContext.Products.Add(CreateProduct(20, "Other owner's product", otherCategory));
        await dbContext.SaveChangesAsync();
        var service = new ProductService(dbContext, new StubCurrentUser("owner-one"));

        var result = await service.GetPageAsync(2, 10);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(12, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.All(result.Items, product => Assert.Equal("Fruit", product.CategoryName));
    }

    [Fact]
    public async Task GetByIdAsync_OwnedProduct_ReturnsProductWithCategoryName()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory(1, "owner-one", "Fruit");
        dbContext.Products.Add(CreateProduct(1, "Apples", category));
        await dbContext.SaveChangesAsync();
        var service = new ProductService(dbContext, new StubCurrentUser("owner-one"));

        var result = await service.GetByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Fruit", result.CategoryName);
        Assert.Equal("202608-001", result.ProductCode);
    }

    [Fact]
    public async Task GetByIdAsync_ProductOwnedByAnotherUser_ReturnsNull()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory(1, "owner-two", "Fruit");
        dbContext.Products.Add(CreateProduct(1, "Apples", category));
        await dbContext.SaveChangesAsync();
        var service = new ProductService(dbContext, new StubCurrentUser("owner-one"));

        var result = await service.GetByIdAsync(1);

        Assert.Null(result);
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static Category CreateCategory(int categoryId, string ownerUserId, string name)
    {
        return new Category
        {
            CategoryId = categoryId,
            OwnerUserId = ownerUserId,
            Name = name,
            CategoryCode = $"CAT{categoryId:D3}",
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = DateTime.UtcNow
        };
    }

    private static Product CreateProduct(int productId, string name, Category category)
    {
        return new Product
        {
            ProductId = productId,
            CategoryId = category.CategoryId,
            ProductCode = $"202608-{productId:D3}",
            Name = name,
            Price = productId,
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
}
