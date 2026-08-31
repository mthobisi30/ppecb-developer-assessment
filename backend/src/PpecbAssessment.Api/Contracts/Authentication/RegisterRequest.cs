using System.ComponentModel.DataAnnotations;

namespace PpecbAssessment.Api.Contracts.Authentication;

public sealed class RegisterRequest
{
    [Required]
    [EmailAddress]
    [StringLength(256)]
    public required string Email { get; init; }

    [Required]
    [StringLength(128)]
    public required string Password { get; init; }
}
