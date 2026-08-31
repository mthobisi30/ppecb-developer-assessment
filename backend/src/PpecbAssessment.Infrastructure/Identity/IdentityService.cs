using Microsoft.AspNetCore.Identity;
using PpecbAssessment.Application.Authentication;

namespace PpecbAssessment.Infrastructure.Identity;

public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager) : IIdentityService
{
    private static readonly IReadOnlyDictionary<string, string[]> EmptyErrors =
        new Dictionary<string, string[]>();

    public async Task<UserLoginResult> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userManager.FindByEmailAsync(email.Trim());

        if (user is null)
        {
            return new UserLoginResult(null, null, LoginFailureKind.InvalidCredentials);
        }

        var signInResult = await signInManager.PasswordSignInAsync(
            user,
            password,
            isPersistent: false,
            lockoutOnFailure: true);

        if (signInResult.Succeeded)
        {
            return new UserLoginResult(user.Id, user.Email, LoginFailureKind.None);
        }

        var failure = signInResult.IsLockedOut
            ? LoginFailureKind.LockedOut
            : LoginFailureKind.InvalidCredentials;

        return new UserLoginResult(null, null, failure);
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await signInManager.SignOutAsync();
    }

    public async Task<UserRegistrationResult> RegisterAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var trimmedEmail = email.Trim();
        var existingUser = await userManager.FindByEmailAsync(trimmedEmail);

        if (existingUser is not null)
        {
            return DuplicateEmailResult();
        }

        var user = new ApplicationUser
        {
            Email = trimmedEmail,
            UserName = trimmedEmail
        };

        var identityResult = await userManager.CreateAsync(user, password);

        if (identityResult.Succeeded)
        {
            return new UserRegistrationResult(
                user.Id,
                user.Email,
                RegistrationFailureKind.None,
                EmptyErrors);
        }

        var failure = identityResult.Errors.Any(IsDuplicateEmailError)
            ? RegistrationFailureKind.DuplicateEmail
            : RegistrationFailureKind.Validation;

        return new UserRegistrationResult(
            null,
            null,
            failure,
            MapErrors(identityResult.Errors));
    }

    private static UserRegistrationResult DuplicateEmailResult()
    {
        return new UserRegistrationResult(
            null,
            null,
            RegistrationFailureKind.DuplicateEmail,
            new Dictionary<string, string[]>
            {
                ["Email"] = ["An account with this email address already exists."]
            });
    }

    private static IReadOnlyDictionary<string, string[]> MapErrors(IEnumerable<IdentityError> errors)
    {
        return errors
            .GroupBy(GetErrorField)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Description).ToArray());
    }

    private static string GetErrorField(IdentityError error)
    {
        if (error.Code.StartsWith("Password", StringComparison.Ordinal))
        {
            return "Password";
        }

        return "Email";
    }

    private static bool IsDuplicateEmailError(IdentityError error)
    {
        return error.Code is "DuplicateEmail" or "DuplicateUserName";
    }
}
