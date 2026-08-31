using Microsoft.EntityFrameworkCore;
using PpecbAssessment.Application.Common.Interfaces;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class ProductImageService(
    ApplicationDbContext dbContext,
    ICurrentUser currentUser,
    IProductImageStorage imageStorage,
    TimeProvider timeProvider) : IProductImageService
{
    public async Task<ProductImageResult> UploadAsync(
        int productId,
        Stream content,
        string fileExtension,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = currentUser.UserId
            ?? throw new InvalidOperationException("An authenticated user is required.");
        var product = await dbContext.Products
            .Include(candidate => candidate.Category)
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.ProductId == productId
                    && candidate.Category.OwnerUserId == ownerUserId,
                cancellationToken);

        if (product is null)
        {
            return new ProductImageResult(null, ProductFailureKind.NotFound);
        }

        var previousImagePath = product.ImagePath;
        var imagePath = await imageStorage.SaveAsync(
            content,
            fileExtension,
            cancellationToken);

        product.ImagePath = imagePath;
        product.UpdatedByUserId = ownerUserId;
        product.UpdatedDateUtc = timeProvider.GetUtcNow().UtcDateTime;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await imageStorage.TryDeleteAsync(imagePath, cancellationToken);
            return new ProductImageResult(null, ProductFailureKind.ConcurrencyConflict);
        }

        await imageStorage.TryDeleteAsync(previousImagePath, cancellationToken);
        return new ProductImageResult(Map(product), ProductFailureKind.None);
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
}
