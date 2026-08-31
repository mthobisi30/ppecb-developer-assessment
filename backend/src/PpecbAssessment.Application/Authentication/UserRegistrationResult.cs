namespace PpecbAssessment.Application.Authentication;

public sealed record UserRegistrationResult(
    string? UserId,
    string? Email,
    RegistrationFailureKind Failure,
    IReadOnlyDictionary<string, string[]> Errors)
{
    public bool Succeeded => Failure == RegistrationFailureKind.None;
}
