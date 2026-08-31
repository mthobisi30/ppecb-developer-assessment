using PpecbAssessment.Api.Configuration;
using PpecbAssessment.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApiServices(
    requireSecureCookies: !builder.Environment.IsDevelopment());
builder.Services.AddInfrastructure(
    builder.Configuration,
    requireSecureCookies: !builder.Environment.IsDevelopment());

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
