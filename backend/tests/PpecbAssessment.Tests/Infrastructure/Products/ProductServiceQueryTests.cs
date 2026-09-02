using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
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
        var service = CreateService(dbContext, "owner-one");

        var result = await service.GetPageAsync(
            2,
            10,
            ProductSortField.Name,
            ProductSortDirection.Ascending);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(12, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.All(result.Items, product => Assert.Equal("Fruit", product.CategoryName));
    }

    [Theory]
    [InlineData(ProductSortField.Name, ProductSortDirection.Ascending, "2,1,3,4")]
    [InlineData(ProductSortField.Name, ProductSortDirection.Descending, "4,3,1,2")]
    [InlineData(ProductSortField.ProductCode, ProductSortDirection.Ascending, "4,2,1,3")]
    [InlineData(ProductSortField.ProductCode, ProductSortDirection.Descending, "3,1,2,4")]
    [InlineData(ProductSortField.CategoryName, ProductSortDirection.Ascending, "1,3,2,4")]
    [InlineData(ProductSortField.CategoryName, ProductSortDirection.Descending, "2,4,1,3")]
    [InlineData(ProductSortField.Price, ProductSortDirection.Ascending, "3,4,1,2")]
    [InlineData(ProductSortField.Price, ProductSortDirection.Descending, "2,1,4,3")]
    public async Task GetPageAsync_SortSelected_ReturnsOwnedProductsInOrder(
        ProductSortField sortBy,
        ProductSortDirection sortDirection,
        string expectedProductIds)
    {
        await using var dbContext = CreateDbContext();
        var fruit = CreateCategory(1, "owner-one", "Fruit");
        var vegetables = CreateCategory(2, "owner-one", "Vegetables");
        var otherCategory = CreateCategory(3, "owner-two", "Other");
        dbContext.Products.AddRange(
            CreateProduct(1, "Bananas", fruit, 25m, "202608-003"),
            CreateProduct(2, "Apples", vegetables, 40m, "202608-002"),
            CreateProduct(3, "Cherries", fruit, 10m, "202608-004"),
            CreateProduct(4, "Dates", vegetables, 20m, "202608-001"),
            CreateProduct(5, "Other", otherCategory, 5m, "202608-005"));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

        var result = await service.GetPageAsync(1, 10, sortBy, sortDirection);

        var expectedIds = expectedProductIds
            .Split(',')
            .Select(int.Parse)
            .ToArray();
        Assert.Equal(expectedIds, result.Items.Select(product => product.ProductId));
    }

    [Fact]
    public async Task GetByIdAsync_OwnedProduct_ReturnsProductWithCategoryName()
    {
        await using var dbContext = CreateDbContext();
        var category = CreateCategory(1, "owner-one", "Fruit");
        dbContext.Products.Add(CreateProduct(1, "Apples", category));
        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext, "owner-one");

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
        var service = CreateService(dbContext, "owner-one");

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

    private static ProductService CreateService(
        ApplicationDbContext dbContext,
        string userId)
    {
        return new ProductService(
            dbContext,
            new StubCurrentUser(userId),
            new StubProductCodeGenerator(),
            TimeProvider.System);
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

    private static Product CreateProduct(
        int productId,
        string name,
        Category category,
        decimal? price = null,
        string? productCode = null)
    {
        return new Product
        {
            ProductId = productId,
            CategoryId = category.CategoryId,
            ProductCode = productCode ?? $"202608-{productId:D3}",
            Name = name,
            Price = price ?? productId,
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

    private sealed class StubProductCodeGenerator : IProductCodeGenerator
    {
        public Task<ProductCodeGenerationResult> GenerateAsync(
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new ProductCodeGenerationResult("202608-999"));
        }
    }
}
