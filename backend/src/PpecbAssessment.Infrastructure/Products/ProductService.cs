using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class ProductService(
    ApplicationDbContext dbContext,
    ICurrentUser currentUser,
    IProductCodeGenerator productCodeGenerator,
    TimeProvider timeProvider,
    IProductImageStorage? productImageStorage = null) : IProductService
{
    public async Task<ProductPage> GetPageAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var query = dbContext.Products
            .AsNoTracking()
            .Where(product => product.Category.OwnerUserId == ownerUserId);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(product => product.Name)
            .ThenBy(product => product.ProductId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(product => new ProductDetails(
                product.ProductId,
                product.ProductCode,
                product.Name,
                product.Description,
                product.Price,
                product.CategoryId,
                product.Category.Name,
                product.ImagePath,
                product.RowVersion))
            .ToListAsync(cancellationToken);

        return new ProductPage(
            items,
            page,
            pageSize,
            totalCount,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public Task<ProductDetails?> GetByIdAsync(
        int productId,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();

        return dbContext.Products
            .AsNoTracking()
            .Where(product =>
                product.ProductId == productId
                && product.Category.OwnerUserId == ownerUserId)
            .Select(product => new ProductDetails(
                product.ProductId,
                product.ProductCode,
                product.Name,
                product.Description,
                product.Price,
                product.CategoryId,
                product.Category.Name,
                product.ImagePath,
                product.RowVersion))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ProductWriteResult> CreateAsync(
        string name,
        string? description,
        decimal price,
        int categoryId,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var category = await dbContext.Categories.SingleOrDefaultAsync(
            candidate =>
                candidate.CategoryId == categoryId
                && candidate.OwnerUserId == ownerUserId
                && candidate.IsActive,
            cancellationToken);

        if (category is null)
        {
            return WriteFailure(ProductFailureKind.CategoryUnavailable);
        }

        var codeResult = await productCodeGenerator.GenerateAsync(cancellationToken);
        if (!codeResult.Succeeded)
        {
            return WriteFailure(ProductFailureKind.CodeLimitReached);
        }

        var product = new Product
        {
            ProductCode = codeResult.ProductCode!,
            Name = name.Trim(),
            Description = NormalizeDescription(description),
            Price = price,
            CategoryId = category.CategoryId,
            Category = category,
            CreatedByUserId = ownerUserId,
            CreatedDateUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return WriteSuccess(product);
    }

    public async Task<ProductWriteResult> UpdateAsync(
        int productId,
        string name,
        string? description,
        decimal price,
        int categoryId,
        byte[] expectedRowVersion,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var product = await dbContext.Products
            .Include(candidate => candidate.Category)
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.ProductId == productId
                    && candidate.Category.OwnerUserId == ownerUserId,
                cancellationToken);

        if (product is null)
        {
            return WriteFailure(ProductFailureKind.NotFound);
        }

        if (categoryId != product.CategoryId)
        {
            var category = await dbContext.Categories.SingleOrDefaultAsync(
                candidate =>
                    candidate.CategoryId == categoryId
                    && candidate.OwnerUserId == ownerUserId
                    && candidate.IsActive,
                cancellationToken);

            if (category is null)
            {
                return WriteFailure(ProductFailureKind.CategoryUnavailable);
            }

            product.CategoryId = category.CategoryId;
            product.Category = category;
        }

        dbContext.Entry(product)
            .Property(candidate => candidate.RowVersion)
            .OriginalValue = expectedRowVersion;

        product.Name = name.Trim();
        product.Description = NormalizeDescription(description);
        product.Price = price;
        product.UpdatedByUserId = ownerUserId;
        product.UpdatedDateUtc = timeProvider.GetUtcNow().UtcDateTime;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return WriteSuccess(product);
        }
        catch (DbUpdateConcurrencyException)
        {
            return WriteFailure(ProductFailureKind.ConcurrencyConflict);
        }
    }

    public async Task<ProductDeleteResult> DeleteAsync(
        int productId,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = GetOwnerUserId();
        var product = await dbContext.Products
            .Include(candidate => candidate.Category)
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.ProductId == productId
                    && candidate.Category.OwnerUserId == ownerUserId,
                cancellationToken);

        if (product is null)
        {
            return new ProductDeleteResult(ProductFailureKind.NotFound, null);
        }

        dbContext.Products.Remove(product);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            if (productImageStorage is not null)
            {
                await productImageStorage.TryDeleteAsync(product.ImagePath, cancellationToken);
            }

            return new ProductDeleteResult(ProductFailureKind.None, product.ImagePath);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new ProductDeleteResult(ProductFailureKind.ConcurrencyConflict, null);
        }
    }

    private string GetOwnerUserId()
    {
        return currentUser.UserId
            ?? throw new InvalidOperationException("An authenticated user is required.");
    }

    private static string? NormalizeDescription(string? description)
    {
        return string.IsNullOrWhiteSpace(description) ? null : description.Trim();
    }

    private static ProductDetails Map(Product product)
    {
        return new ProductDetails(
            product.ProductId,
            product.ProductCode,
            product.Name,
            product.Description,
            product.Price,
            product.CategoryId,
            product.Category.Name,
            product.ImagePath,
            product.RowVersion);
    }

    private static ProductWriteResult WriteSuccess(Product product)
    {
        return new ProductWriteResult(Map(product), ProductFailureKind.None);
    }

    private static ProductWriteResult WriteFailure(ProductFailureKind failure)
    {
        return new ProductWriteResult(null, failure);
    }
}
