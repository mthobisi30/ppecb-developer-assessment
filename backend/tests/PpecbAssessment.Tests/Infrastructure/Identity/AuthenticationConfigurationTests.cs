using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PpecbAssessment.Infrastructure;

namespace PpecbAssessment.Tests.Infrastructure.Identity;

public sealed class AuthenticationConfigurationTests
{
    [Fact]
    public void AddInfrastructure_ServicesConfigured_DefinesIdentityPolicy()
    {
        using var provider = CreateServiceProvider(requireSecureCookies: false);
        var options = provider.GetRequiredService<IOptions<IdentityOptions>>().Value;

        Assert.True(options.User.RequireUniqueEmail);
        Assert.False(options.SignIn.RequireConfirmedAccount);
        Assert.Equal(8, options.Password.RequiredLength);
        Assert.Equal(4, options.Password.RequiredUniqueChars);
        Assert.True(options.Password.RequireDigit);
        Assert.True(options.Password.RequireLowercase);
        Assert.True(options.Password.RequireUppercase);
        Assert.True(options.Password.RequireNonAlphanumeric);
        Assert.True(options.Lockout.AllowedForNewUsers);
        Assert.Equal(5, options.Lockout.MaxFailedAccessAttempts);
        Assert.Equal(TimeSpan.FromMinutes(15), options.Lockout.DefaultLockoutTimeSpan);
    }

    [Theory]
    [InlineData(false, CookieSecurePolicy.SameAsRequest)]
    [InlineData(true, CookieSecurePolicy.Always)]
    public async Task AddInfrastructure_EnvironmentSelected_ConfiguresApplicationCookie(
        bool requireSecureCookies,
        CookieSecurePolicy expectedSecurePolicy)
    {
        using var provider = CreateServiceProvider(requireSecureCookies);
        var schemeProvider = provider.GetRequiredService<IAuthenticationSchemeProvider>();
        var defaultScheme = await schemeProvider.GetDefaultAuthenticateSchemeAsync();
        var options = GetApplicationCookieOptions(provider);

        Assert.Equal(IdentityConstants.ApplicationScheme, defaultScheme!.Name);
        Assert.Equal("PpecbAssessment.Auth", options.Cookie.Name);
        Assert.True(options.Cookie.HttpOnly);
        Assert.True(options.Cookie.IsEssential);
        Assert.Equal(SameSiteMode.Strict, options.Cookie.SameSite);
        Assert.Equal(expectedSecurePolicy, options.Cookie.SecurePolicy);
        Assert.Equal(TimeSpan.FromHours(8), options.ExpireTimeSpan);
        Assert.True(options.SlidingExpiration);
    }

    [Fact]
    public async Task ApplicationCookie_UnauthenticatedRequest_ReturnsUnauthorizedStatus()
    {
        using var provider = CreateServiceProvider(requireSecureCookies: false);
        var options = GetApplicationCookieOptions(provider);
        var context = CreateRedirectContext(options);

        await options.Events.OnRedirectToLogin(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task ApplicationCookie_ForbiddenRequest_ReturnsForbiddenStatus()
    {
        using var provider = CreateServiceProvider(requireSecureCookies: false);
        var options = GetApplicationCookieOptions(provider);
        var context = CreateRedirectContext(options);

        await options.Events.OnRedirectToAccessDenied(context);

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    private static ServiceProvider CreateServiceProvider(bool requireSecureCookies)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Server=localhost;Database=PpecbAssessmentTests;Trusted_Connection=True;TrustServerCertificate=True"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddInfrastructure(configuration, requireSecureCookies);

        return services.BuildServiceProvider();
    }

    private static CookieAuthenticationOptions GetApplicationCookieOptions(IServiceProvider provider)
    {
        return provider
            .GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(IdentityConstants.ApplicationScheme);
    }

    private static RedirectContext<CookieAuthenticationOptions> CreateRedirectContext(
        CookieAuthenticationOptions options)
    {
        return new RedirectContext<CookieAuthenticationOptions>(
            new DefaultHttpContext(),
            new AuthenticationScheme(
                IdentityConstants.ApplicationScheme,
                IdentityConstants.ApplicationScheme,
                typeof(CookieAuthenticationHandler)),
            options,
            new AuthenticationProperties(),
            "/");
    }
}
