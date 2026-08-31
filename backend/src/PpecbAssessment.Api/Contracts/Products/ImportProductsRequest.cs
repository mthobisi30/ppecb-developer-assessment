using System.ComponentModel.DataAnnotations;

namespace PpecbAssessment.Api.Contracts.Products;

public sealed class ImportProductsRequest
{
    [Required]
    public IFormFile? File { get; init; }
}
