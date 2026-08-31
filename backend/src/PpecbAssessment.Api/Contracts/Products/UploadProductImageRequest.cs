using System.ComponentModel.DataAnnotations;

namespace PpecbAssessment.Api.Contracts.Products;

public sealed class UploadProductImageRequest
{
    [Required]
    public IFormFile? File { get; init; }
}
