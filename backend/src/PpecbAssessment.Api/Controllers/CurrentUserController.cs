using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;
using PpecbAssessment.Application.Common.Interfaces;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/auth")]
public sealed class CurrentUserController(ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public ActionResult<CurrentUserResponse> Get()
    {
        if (!currentUser.IsAuthenticated
            || string.IsNullOrWhiteSpace(currentUser.UserId)
            || string.IsNullOrWhiteSpace(currentUser.Email))
        {
            return Unauthorized(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Authentication is required."
            });
        }

        return Ok(new CurrentUserResponse(currentUser.UserId, currentUser.Email));
    }
}
