using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;
using PpecbAssessment.Api.Controllers;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class CsrfControllerTests
{
    [Fact]
    public void Get_RequestTokenGenerated_ReturnsToken()
    {
        var controller = new CsrfController(new StubAntiforgery())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var response = controller.Get();

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<CsrfTokenResponse>(okResult.Value);
        Assert.Equal("request-token", body.Token);
    }

    private sealed class StubAntiforgery : IAntiforgery
    {
        public AntiforgeryTokenSet GetAndStoreTokens(HttpContext httpContext)
        {
            return new AntiforgeryTokenSet(
                "request-token",
                "cookie-token",
                "__RequestVerificationToken",
                "X-CSRF-TOKEN");
        }

        public AntiforgeryTokenSet GetTokens(HttpContext httpContext)
        {
            return GetAndStoreTokens(httpContext);
        }

        public Task<bool> IsRequestValidAsync(HttpContext httpContext)
        {
            return Task.FromResult(true);
        }

        public Task ValidateRequestAsync(HttpContext httpContext)
        {
            return Task.CompletedTask;
        }

        public void SetCookieTokenAndHeader(HttpContext httpContext)
        {
        }
    }
}
