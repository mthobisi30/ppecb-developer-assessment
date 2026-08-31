namespace PpecbAssessment.Application.Authentication;

public interface IIdentityService
{
    Task<UserRegistrationResult> RegisterAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);
}
