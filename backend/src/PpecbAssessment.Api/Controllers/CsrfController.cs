using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PpecbAssessment.Api.Contracts.Authentication;

namespace PpecbAssessment.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/auth")]
public sealed class CsrfController(IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf")]
    [ProducesResponseType<CsrfTokenResponse>(StatusCodes.Status200OK)]
    public ActionResult<CsrfTokenResponse> Get()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new CsrfTokenResponse(tokens.RequestToken!));
    }
}
