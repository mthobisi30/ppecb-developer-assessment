using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PpecbAssessment.Api.Configuration;
using Swashbuckle.AspNetCore.Swagger;

namespace PpecbAssessment.Tests.Api.Configuration;

public sealed class ApiServiceCollectionExtensionsTests
{
    [Theory]
    [InlineData(false, CookieSecurePolicy.SameAsRequest)]
    [InlineData(true, CookieSecurePolicy.Always)]
    public void AddApiServices_EnvironmentSelected_ConfiguresAntiforgery(
        bool requireSecureCookies,
        CookieSecurePolicy expectedSecurePolicy)
    {
        using var provider = CreateServiceProvider(requireSecureCookies);
        var options = provider.GetRequiredService<IOptions<AntiforgeryOptions>>().Value;

        Assert.Equal("X-CSRF-TOKEN", options.HeaderName);
        Assert.Equal("PpecbAssessment.Antiforgery", options.Cookie.Name);
        Assert.True(options.Cookie.HttpOnly);
        Assert.True(options.Cookie.IsEssential);
        Assert.Equal(SameSiteMode.Strict, options.Cookie.SameSite);
        Assert.Equal(expectedSecurePolicy, options.Cookie.SecurePolicy);
    }

    [Fact]
    public void AddApiServices_ServicesConfigured_RegistersProblemDetailsAndOpenApi()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddApiServices(requireSecureCookies: false);
        using var provider = services.BuildServiceProvider();

        Assert.NotNull(provider.GetService<IProblemDetailsService>());
        Assert.Contains(services, descriptor => descriptor.ServiceType == typeof(ISwaggerProvider));
    }

    private static ServiceProvider CreateServiceProvider(bool requireSecureCookies)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddApiServices(requireSecureCookies);

        return services.BuildServiceProvider();
    }
}
