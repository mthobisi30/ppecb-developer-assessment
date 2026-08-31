namespace PpecbAssessment.Application.Authentication;

public interface IIdentityService
{
    Task<UserLoginResult> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);

    Task LogoutAsync(CancellationToken cancellationToken = default);

    Task<UserRegistrationResult> RegisterAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);
}
