using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PpecbAssessment.Infrastructure.Identity;

namespace PpecbAssessment.Tests.Infrastructure.Identity;

public sealed class CurrentUserTests
{
    [Fact]
    public void AuthenticatedPrincipal_IdentityClaims_ReturnsCurrentUser()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "user-id"),
            new Claim(ClaimTypes.Email, "person@example.com")
        ], "Identity.Application"));
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        var currentUser = new CurrentUser(accessor);

        Assert.True(currentUser.IsAuthenticated);
        Assert.Equal("user-id", currentUser.UserId);
        Assert.Equal("person@example.com", currentUser.Email);
    }

    [Fact]
    public void AnonymousPrincipal_NoIdentityClaims_ReturnsEmptyCurrentUser()
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };

        var currentUser = new CurrentUser(accessor);

        Assert.False(currentUser.IsAuthenticated);
        Assert.Null(currentUser.UserId);
        Assert.Null(currentUser.Email);
    }
}
