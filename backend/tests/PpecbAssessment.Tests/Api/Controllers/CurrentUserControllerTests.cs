using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Common.Interfaces;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class CurrentUserControllerTests
{
    [Fact]
    public void Get_AuthenticatedUser_ReturnsUserDetails()
    {
        var controller = new CurrentUserController(
            new StubCurrentUser(true, "user-id", "person@example.com"));

        var response = controller.Get();

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<CurrentUserResponse>(okResult.Value);
        Assert.Equal("user-id", body.UserId);
        Assert.Equal("person@example.com", body.Email);
    }

    [Fact]
    public void Get_MissingIdentity_ReturnsUnauthorizedProblem()
    {
        var controller = new CurrentUserController(new StubCurrentUser(false, null, null));

        var response = controller.Get();

        var result = Assert.IsType<UnauthorizedObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.Status);
    }

    private sealed record StubCurrentUser(
        bool IsAuthenticated,
        string? UserId,
        string? Email) : ICurrentUser;
}
