using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PpecbAssessment.Application.Authentication;
using PpecbAssessment.Infrastructure.Identity;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Tests.Infrastructure.Identity;

public sealed class IdentityServiceTests
{
    [Fact]
    public async Task RegisterAsync_ValidCredentials_CreatesNormalisedUser()
    {
        using var provider = CreateServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IIdentityService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var result = await service.RegisterAsync(
            "  person@example.com  ",
            "ValidPassword1!");
        var user = await userManager.FindByEmailAsync("person@example.com");

        Assert.True(result.Succeeded);
        Assert.Equal(RegistrationFailureKind.None, result.Failure);
        Assert.Equal("person@example.com", result.Email);
        Assert.NotNull(user);
        Assert.Equal("PERSON@EXAMPLE.COM", user.NormalizedEmail);
        Assert.NotNull(user.PasswordHash);
    }

    [Fact]
    public async Task RegisterAsync_InvalidPassword_ReturnsValidationErrors()
    {
        using var provider = CreateServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IIdentityService>();

        var result = await service.RegisterAsync("person@example.com", "weak");

        Assert.False(result.Succeeded);
        Assert.Equal(RegistrationFailureKind.Validation, result.Failure);
        Assert.NotEmpty(result.Errors["Password"]);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ReturnsConflict()
    {
        using var provider = CreateServiceProvider();
        using var scope = provider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IIdentityService>();

        var firstResult = await service.RegisterAsync(
            "person@example.com",
            "ValidPassword1!");
        var secondResult = await service.RegisterAsync(
            "PERSON@example.com",
            "AnotherPassword2!");

        Assert.True(firstResult.Succeeded);
        Assert.False(secondResult.Succeeded);
        Assert.Equal(RegistrationFailureKind.DuplicateEmail, secondResult.Failure);
        Assert.NotEmpty(secondResult.Errors["Email"]);
    }

    private static ServiceProvider CreateServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequiredUniqueChars = 4;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddScoped<IIdentityService, IdentityService>();

        return services.BuildServiceProvider();
    }
}
