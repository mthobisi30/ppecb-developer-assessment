using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;
using PpecbAssessment.Application.Authentication;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IIdentityService identityService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await identityService.LoginAsync(
            request.Email,
            request.Password,
            cancellationToken);

        if (result.Succeeded)
        {
            return Ok(new LoginResponse(result.UserId!, result.Email!));
        }

        return Unauthorized(new ProblemDetails
        {
            Status = StatusCodes.Status401Unauthorized,
            Title = "Invalid email or password."
        });
    }

    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegisterResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result = await identityService.RegisterAsync(
            request.Email,
            request.Password,
            cancellationToken);

        if (result.Succeeded)
        {
            return Ok(new RegisterResponse(result.UserId!, result.Email!));
        }

        var statusCode = result.Failure == RegistrationFailureKind.DuplicateEmail
            ? StatusCodes.Status409Conflict
            : StatusCodes.Status400BadRequest;
        var problem = new ValidationProblemDetails(
            result.Errors.ToDictionary(pair => pair.Key, pair => pair.Value))
        {
            Status = statusCode,
            Title = statusCode == StatusCodes.Status409Conflict
                ? "Registration conflict."
                : "Registration validation failed."
        };

        return StatusCode(statusCode, problem);
    }
}
