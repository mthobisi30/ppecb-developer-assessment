using System.ComponentModel.DataAnnotations;

namespace PpecbAssessment.Api.Contracts.Categories;

public sealed class UpdateCategoryRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [RegularExpression("^[A-Z]{3}[0-9]{3}$")]
    public string CategoryCode { get; init; } = string.Empty;

    public bool IsActive { get; init; }

    [Required]
    public string RowVersion { get; init; } = string.Empty;
}
