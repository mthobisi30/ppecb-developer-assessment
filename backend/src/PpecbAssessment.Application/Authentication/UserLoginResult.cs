namespace PpecbAssessment.Application.Authentication;

public sealed record UserLoginResult(
    string? UserId,
    string? Email,
    LoginFailureKind Failure)
{
    public bool Succeeded => Failure == LoginFailureKind.None;
}
