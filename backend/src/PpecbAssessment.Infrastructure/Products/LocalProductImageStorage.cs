using Microsoft.AspNetCore.Hosting;
using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class LocalProductImageStorage(IWebHostEnvironment environment)
    : IProductImageStorage
{
    private const string RequestPath = "/uploads/products";

    private string StorageDirectory => Path.Combine(
        environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"),
        "uploads",
        "products");

    public async Task<string> SaveAsync(
        Stream content,
        string fileExtension,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(StorageDirectory);
        var fileName = $"{Guid.NewGuid():N}{fileExtension}";
        var filePath = Path.Combine(StorageDirectory, fileName);

        await using var destination = new FileStream(
            filePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            FileOptions.Asynchronous);
        await content.CopyToAsync(destination, cancellationToken);

        return $"{RequestPath}/{fileName}";
    }

    public Task TryDeleteAsync(
        string? imagePath,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return Task.CompletedTask;
        }

        try
        {
            var filePath = Path.Combine(StorageDirectory, Path.GetFileName(imagePath));
            File.Delete(filePath);
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }

        return Task.CompletedTask;
    }
}
