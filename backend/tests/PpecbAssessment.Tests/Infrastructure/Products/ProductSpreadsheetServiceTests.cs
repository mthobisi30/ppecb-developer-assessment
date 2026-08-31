using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;
using PpecbAssessment.Infrastructure.Products;

namespace PpecbAssessment.Tests.Infrastructure.Products;

public sealed class ProductSpreadsheetServiceTests
{
    [Fact]
    public async Task ImportAsync_AllRowsValid_InsertsEveryProduct()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var codeGenerator = new StubProductCodeGenerator(
            "202608-001",
            "202608-002");
        var service = CreateService(dbContext, "owner-one", codeGenerator);
        await using var workbook = CreateWorkbook(
            ["Apples", "Fresh", "FRT001", 24.99m],
            ["Pears", "", "FRT001", 19.50m]);

        var result = await service.ImportAsync(workbook);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.ImportedCount);
        var products = await dbContext.Products.OrderBy(product => product.ProductCode).ToListAsync();
        Assert.Equal(2, products.Count);
        Assert.Equal("202608-001", products[0].ProductCode);
        Assert.Equal("Pears", products[1].Name);
        Assert.Null(products[1].Description);
    }

    [Fact]
    public async Task ImportAsync_OneRowInvalid_InsertsNoProductsAndAllocatesNoCodes()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", "FRT001", true));
        await dbContext.SaveChangesAsync();
        var codeGenerator = new StubProductCodeGenerator("202608-001");
        var service = CreateService(dbContext, "owner-one", codeGenerator);
        await using var workbook = CreateWorkbook(
            ["Apples", "Fresh", "FRT001", 24.99m],
            ["", "Missing name", "FRT001", 10m]);

        var result = await service.ImportAsync(workbook);

        Assert.False(result.Succeeded);
        Assert.Contains(result.Errors, error => error.RowNumber == 3 && error.Field == "Name");
        Assert.Equal(0, codeGenerator.CallCount);
        Assert.Empty(dbContext.Products);
    }

    [Fact]
    public async Task ImportAsync_InactiveCategory_InsertsNoProducts()
    {
        await using var dbContext = CreateDbContext();
        dbContext.Categories.Add(CreateCategory(1, "owner-one", "FRT001", false));
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator("202608-001"));
        await using var workbook = CreateWorkbook(
            ["Apples", "Fresh", "FRT001", 24.99m]);

        var result = await service.ImportAsync(workbook);

        Assert.Contains(result.Errors, error => error.Field == "CategoryCode");
        Assert.Empty(dbContext.Products);
    }

    [Fact]
    public async Task ExportAsync_MultipleOwners_ExportsOnlyCurrentUsersProducts()
    {
        await using var dbContext = CreateDbContext();
        var ownedCategory = CreateCategory(1, "owner-one", "FRT001", true);
        var otherCategory = CreateCategory(2, "owner-two", "VEG001", true);
        dbContext.Products.AddRange(
            CreateProduct(1, "Apples", ownedCategory),
            CreateProduct(2, "Carrots", otherCategory));
        await dbContext.SaveChangesAsync();
        var service = CreateService(
            dbContext,
            "owner-one",
            new StubProductCodeGenerator());

        var content = await service.ExportAsync();

        using var workbook = new XLWorkbook(new MemoryStream(content));
        var worksheet = workbook.Worksheet("Products");
        Assert.Equal("ProductCode", worksheet.Cell(1, 1).GetString());
        Assert.Equal("Apples", worksheet.Cell(2, 2).GetString());
        Assert.True(worksheet.Cell(3, 1).IsEmpty());
    }

    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static ProductSpreadsheetService CreateService(
        ApplicationDbContext dbContext,
        string userId,
        IProductCodeGenerator productCodeGenerator)
    {
        return new ProductSpreadsheetService(
            dbContext,
            new StubCurrentUser(userId),
            productCodeGenerator,
            TimeProvider.System);
    }

    private static MemoryStream CreateWorkbook(params object?[][] rows)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Products");
        worksheet.Cell(1, 1).Value = "Name";
        worksheet.Cell(1, 2).Value = "Description";
        worksheet.Cell(1, 3).Value = "CategoryCode";
        worksheet.Cell(1, 4).Value = "Price";

        for (var rowIndex = 0; rowIndex < rows.Length; rowIndex++)
        {
            for (var columnIndex = 0; columnIndex < rows[rowIndex].Length; columnIndex++)
            {
                worksheet.Cell(rowIndex + 2, columnIndex + 1).Value =
                    XLCellValue.FromObject(rows[rowIndex][columnIndex]);
            }
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    private static Category CreateCategory(
        int categoryId,
        string ownerUserId,
        string categoryCode,
        bool isActive)
    {
        return new Category
        {
            CategoryId = categoryId,
            OwnerUserId = ownerUserId,
            Name = $"Category {categoryId}",
            CategoryCode = categoryCode,
            IsActive = isActive,
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

    private sealed class StubProductCodeGenerator(params string[] productCodes)
        : IProductCodeGenerator
    {
        private readonly Queue<string> productCodes = new(productCodes);

        public int CallCount { get; private set; }

        public Task<ProductCodeGenerationResult> GenerateAsync(
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            var productCode = productCodes.Count > 0 ? productCodes.Dequeue() : null;
            return Task.FromResult(new ProductCodeGenerationResult(productCode));
        }
    }
}
