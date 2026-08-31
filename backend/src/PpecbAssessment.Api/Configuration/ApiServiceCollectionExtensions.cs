using Microsoft.OpenApi.Models;
using PpecbAssessment.Api.Security;

namespace PpecbAssessment.Api.Configuration;

public static class ApiServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        bool requireSecureCookies)
    {
        services.AddScoped<AntiforgeryValidationFilter>();
        services.AddControllers(options =>
            options.Filters.AddService<AntiforgeryValidationFilter>());
        services.AddProblemDetails();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "PPECB Developer Assessment API",
                Version = "v1"
            });
        });
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "PpecbAssessment.Antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = requireSecureCookies
                ? CookieSecurePolicy.Always
                : CookieSecurePolicy.SameAsRequest;
        });

        return services;
    }
}
