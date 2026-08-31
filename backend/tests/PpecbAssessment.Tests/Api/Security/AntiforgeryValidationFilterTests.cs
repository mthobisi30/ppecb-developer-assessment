using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using PpecbAssessment.Api.Security;

namespace PpecbAssessment.Tests.Api.Security;

public sealed class AntiforgeryValidationFilterTests
{
    [Fact]
    public async Task OnAuthorizationAsync_PostWithoutValidToken_ReturnsBadRequestProblem()
    {
        var antiforgery = new StubAntiforgery(isValid: false);
        var filter = new AntiforgeryValidationFilter(antiforgery);
        var context = CreateContext(HttpMethods.Post);

        await filter.OnAuthorizationAsync(context);

        var result = Assert.IsType<BadRequestObjectResult>(context.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.Status);
    }

    [Fact]
    public async Task OnAuthorizationAsync_GetRequest_DoesNotValidateToken()
    {
        var antiforgery = new StubAntiforgery(isValid: false);
        var filter = new AntiforgeryValidationFilter(antiforgery);
        var context = CreateContext(HttpMethods.Get);

        await filter.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        Assert.False(antiforgery.ValidateCalled);
    }

    private static AuthorizationFilterContext CreateContext(string method)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = method;
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor());

        return new AuthorizationFilterContext(actionContext, []);
    }

    private sealed class StubAntiforgery(bool isValid) : IAntiforgery
    {
        public bool ValidateCalled { get; private set; }

        public AntiforgeryTokenSet GetAndStoreTokens(HttpContext httpContext)
        {
            throw new NotSupportedException();
        }

        public AntiforgeryTokenSet GetTokens(HttpContext httpContext)
        {
            throw new NotSupportedException();
        }

        public Task<bool> IsRequestValidAsync(HttpContext httpContext)
        {
            return Task.FromResult(isValid);
        }

        public Task ValidateRequestAsync(HttpContext httpContext)
        {
            ValidateCalled = true;

            return isValid
                ? Task.CompletedTask
                : Task.FromException(new AntiforgeryValidationException("Invalid token."));
        }

        public void SetCookieTokenAndHeader(HttpContext httpContext)
        {
            throw new NotSupportedException();
        }
    }
}
