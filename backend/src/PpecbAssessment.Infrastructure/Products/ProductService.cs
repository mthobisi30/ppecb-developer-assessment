using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class ProductService(
    ApplicationDbContext dbContext,
    ICurrentUser currentUser) : IProductService
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

    private string GetOwnerUserId()
    {
        return currentUser.UserId
            ?? throw new InvalidOperationException("An authenticated user is required.");
    }
}
