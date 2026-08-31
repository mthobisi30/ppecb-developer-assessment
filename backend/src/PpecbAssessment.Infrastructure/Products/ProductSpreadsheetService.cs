using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class ProductSpreadsheetService(
    ApplicationDbContext dbContext,
    ICurrentUser currentUser,
    IProductCodeGenerator productCodeGenerator,
    TimeProvider timeProvider) : IProductSpreadsheetService
{
    private const decimal MaximumPrice = 9999999999999999.99m;

    public async Task<ProductImportResult> ImportAsync(
        Stream content,
        CancellationToken cancellationToken = default)
    {
        XLWorkbook workbook;

        try
        {
            workbook = new XLWorkbook(content);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return InvalidFile("The uploaded file is not a valid .xlsx workbook.");
        }

        using (workbook)
        {
            var worksheet = workbook.Worksheets.FirstOrDefault();
            if (worksheet is null || !HasExpectedHeaders(worksheet))
            {
                return InvalidFile(
                    "The first row must contain Name, Description, CategoryCode, and Price columns.");
            }

            var ownerUserId = GetOwnerUserId();
            var categories = await dbContext.Categories
                .Where(category =>
                    category.OwnerUserId == ownerUserId
                    && category.IsActive)
                .ToDictionaryAsync(
                    category => category.CategoryCode,
                    StringComparer.Ordinal,
                    cancellationToken);
            var parsedRows = ParseRows(worksheet, categories, out var errors);

            if (errors.Count > 0)
            {
                return new ProductImportResult(0, errors);
            }

            IDbContextTransaction? transaction = null;
            if (dbContext.Database.IsRelational())
            {
                transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            }

            try
            {
                foreach (var row in parsedRows)
                {
                    var codeResult = await productCodeGenerator.GenerateAsync(cancellationToken);
                    if (!codeResult.Succeeded)
                    {
                        if (transaction is not null)
                        {
                            await transaction.RollbackAsync(cancellationToken);
                        }

                        return new ProductImportResult(
                            0,
                            [new ProductImportError(
                                row.RowNumber,
                                "ProductCode",
                                "The monthly product-code limit has been reached.")],
                            CodeLimitReached: true);
                    }

                    dbContext.Products.Add(new Product
                    {
                        ProductCode = codeResult.ProductCode!,
                        Name = row.Name,
                        Description = row.Description,
                        Price = row.Price,
                        CategoryId = row.Category.CategoryId,
                        Category = row.Category,
                        CreatedByUserId = ownerUserId,
                        CreatedDateUtc = timeProvider.GetUtcNow().UtcDateTime
                    });
                }

                await dbContext.SaveChangesAsync(cancellationToken);

                if (transaction is not null)
                {
                    await transaction.CommitAsync(cancellationToken);
                }

                return new ProductImportResult(parsedRows.Count, []);
            }
            finally
            {
                if (transaction is not null)
                {
                    await transaction.DisposeAsync();
                }
            }
        }
    }

    public async Task<byte[]> ExportAsync(CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var products = await dbContext.Products
            .AsNoTracking()
            .Where(product => product.Category.OwnerUserId == ownerUserId)
            .OrderBy(product => product.ProductCode)
            .Select(product => new
            {
                product.ProductCode,
                product.Name,
                product.Description,
                product.Category.CategoryCode,
                CategoryName = product.Category.Name,
                product.Price,
                product.ImagePath
            })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Products");
        var headers = new[]
        {
            "ProductCode",
            "Name",
            "Description",
            "CategoryCode",
            "CategoryName",
            "Price",
            "ImagePath"
        };

        for (var column = 0; column < headers.Length; column++)
        {
            worksheet.Cell(1, column + 1).Value = headers[column];
        }

        for (var index = 0; index < products.Count; index++)
        {
            var row = index + 2;
            var product = products[index];
            worksheet.Cell(row, 1).Value = product.ProductCode;
            worksheet.Cell(row, 2).Value = product.Name;
            worksheet.Cell(row, 3).Value = product.Description ?? string.Empty;
            worksheet.Cell(row, 4).Value = product.CategoryCode;
            worksheet.Cell(row, 5).Value = product.CategoryName;
            worksheet.Cell(row, 6).Value = product.Price;
            worksheet.Cell(row, 7).Value = product.ImagePath ?? string.Empty;
        }

        worksheet.Row(1).Style.Font.Bold = true;
        worksheet.Column(6).Style.NumberFormat.Format = "0.00";
        worksheet.Columns().AdjustToContents();

        using var output = new MemoryStream();
        workbook.SaveAs(output);
        return output.ToArray();
    }

    private static List<ImportRow> ParseRows(
        IXLWorksheet worksheet,
        IReadOnlyDictionary<string, Category> categories,
        out List<ProductImportError> errors)
    {
        errors = [];
        var rows = new List<ImportRow>();
        var lastRowNumber = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        for (var rowNumber = 2; rowNumber <= lastRowNumber; rowNumber++)
        {
            var row = worksheet.Row(rowNumber);
            if (row.Cells(1, 4).All(cell => cell.IsEmpty()))
            {
                continue;
            }

            var name = row.Cell(1).GetString().Trim();
            var descriptionValue = row.Cell(2).GetString().Trim();
            var categoryCode = row.Cell(3).GetString().Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add(new ProductImportError(rowNumber, "Name", "Name is required."));
            }
            else if (name.Length > 200)
            {
                errors.Add(new ProductImportError(
                    rowNumber,
                    "Name",
                    "Name cannot exceed 200 characters."));
            }

            if (descriptionValue.Length > 2000)
            {
                errors.Add(new ProductImportError(
                    rowNumber,
                    "Description",
                    "Description cannot exceed 2000 characters."));
            }

            if (!categories.TryGetValue(categoryCode, out var category))
            {
                errors.Add(new ProductImportError(
                    rowNumber,
                    "CategoryCode",
                    "CategoryCode must identify an active category owned by the current user."));
            }

            decimal price = 0;
            if (!row.Cell(4).TryGetValue(out price)
                || price < 0
                || price > MaximumPrice
                || decimal.Round(price, 2) != price)
            {
                errors.Add(new ProductImportError(
                    rowNumber,
                    "Price",
                    "Price must be a non-negative number with no more than two decimal places."));
            }

            if (!string.IsNullOrWhiteSpace(name)
                && name.Length <= 200
                && descriptionValue.Length <= 2000
                && category is not null
                && price >= 0
                && price <= MaximumPrice
                && decimal.Round(price, 2) == price)
            {
                rows.Add(new ImportRow(
                    rowNumber,
                    name,
                    string.IsNullOrWhiteSpace(descriptionValue) ? null : descriptionValue,
                    price,
                    category));
            }
        }

        if (rows.Count == 0 && errors.Count == 0)
        {
            errors.Add(new ProductImportError(2, "File", "The workbook contains no product rows."));
        }

        return rows;
    }

    private static bool HasExpectedHeaders(IXLWorksheet worksheet)
    {
        var expectedHeaders = new[] { "Name", "Description", "CategoryCode", "Price" };

        return expectedHeaders.Select((header, index) => new { header, index })
            .All(item => string.Equals(
                worksheet.Cell(1, item.index + 1).GetString().Trim(),
                item.header,
                StringComparison.OrdinalIgnoreCase));
    }

    private string GetOwnerUserId()
    {
        return currentUser.UserId
            ?? throw new InvalidOperationException("An authenticated user is required.");
    }

    private static ProductImportResult InvalidFile(string message)
    {
        return new ProductImportResult(
            0,
            [new ProductImportError(1, "File", message)]);
    }

    private sealed record ImportRow(
        int RowNumber,
        string Name,
        string? Description,
        decimal Price,
        Category Category);
}
