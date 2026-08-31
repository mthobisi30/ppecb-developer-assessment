namespace PpecbAssessment.Application.Common.Interfaces;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    string? UserId { get; }

    string? Email { get; }
}
