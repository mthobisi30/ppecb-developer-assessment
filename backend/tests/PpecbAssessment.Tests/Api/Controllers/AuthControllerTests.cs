using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;
using PpecbAssessment.Api.Controllers;
using PpecbAssessment.Application.Authentication;

namespace PpecbAssessment.Tests.Api.Controllers;

public sealed class AuthControllerTests
{
    [Fact]
    public async Task Register_ValidCredentials_ReturnsRegisteredUser()
    {
        var result = new UserRegistrationResult(
            "user-id",
            "person@example.com",
            RegistrationFailureKind.None,
            new Dictionary<string, string[]>());
        var controller = new AuthController(new StubIdentityService(result));

        var response = await controller.Register(CreateRequest(), CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response.Result);
        var body = Assert.IsType<RegisterResponse>(okResult.Value);
        Assert.Equal("user-id", body.UserId);
        Assert.Equal("person@example.com", body.Email);
    }

    [Fact]
    public async Task Register_InvalidPassword_ReturnsValidationProblem()
    {
        var result = new UserRegistrationResult(
            null,
            null,
            RegistrationFailureKind.Validation,
            new Dictionary<string, string[]>
            {
                ["Password"] = ["Password requirements were not met."]
            });
        var controller = new AuthController(new StubIdentityService(result));

        var response = await controller.Register(CreateRequest(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        Assert.NotEmpty(problem.Errors["Password"]);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflictProblem()
    {
        var result = new UserRegistrationResult(
            null,
            null,
            RegistrationFailureKind.DuplicateEmail,
            new Dictionary<string, string[]>
            {
                ["Email"] = ["An account with this email address already exists."]
            });
        var controller = new AuthController(new StubIdentityService(result));

        var response = await controller.Register(CreateRequest(), CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(objectResult.Value);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        Assert.NotEmpty(problem.Errors["Email"]);
    }

    private static RegisterRequest CreateRequest()
    {
        return new RegisterRequest
        {
            Email = "person@example.com",
            Password = "ValidPassword1!"
        };
    }

    private sealed class StubIdentityService(UserRegistrationResult result) : IIdentityService
    {
        public Task<UserRegistrationResult> RegisterAsync(
            string email,
            string password,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(result);
        }
    }
}
