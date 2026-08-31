using PpecbAssessment.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddInfrastructure(
    builder.Configuration,
    requireSecureCookies: !builder.Environment.IsDevelopment());

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
