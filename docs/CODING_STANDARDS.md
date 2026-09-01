# Coding Standards

These standards apply to all production code, tests, configuration, and documentation in this repository.

## General principles

- Keep each change focused on one complete, reviewable outcome.
- Prefer clear, direct code over unnecessary abstractions.
- Use descriptive names and keep functions and classes responsible for one concern.
- Remove dead code, unused imports, placeholder comments, and generated sample content.
- Never commit secrets, local environment files, build output, or editor-specific settings.
- Update documentation when a change affects setup, architecture, configuration, or public behaviour.

## Architecture

Dependencies must continue to point towards the domain:

- `Domain` contains entities, value objects, enums, and business rules. It must not reference another project.
- `Application` contains use cases and contracts. It may reference only `Domain`.
- `Infrastructure` implements persistence and external integrations. It may reference `Application` and `Domain`.
- `Api` handles HTTP concerns and application composition. It may reference `Application` and `Infrastructure`.
- Tests must live under `backend/tests` and must not be referenced by production projects.

Do not move business rules into controllers, database configuration, or frontend components.

## C# and .NET

- Enable nullable reference types and resolve nullability warnings rather than suppressing them.
- Use file-scoped namespaces and the formatting produced by `dotnet format`.
- Use PascalCase for types, methods, properties, and public members; use camelCase for parameters and local variables.
- Prefix interfaces with `I`. Do not prefix concrete types.
- Use `Async` on methods that return `Task` or `ValueTask`.
- Accept a `CancellationToken` in asynchronous application and infrastructure operations where cancellation is meaningful.
- Prefer constructor injection and immutable dependencies.
- Keep API controllers or endpoint handlers thin; they should translate HTTP input and output, not implement business rules.
- Keep Entity Framework Core configuration in `Infrastructure` and keep persistence attributes out of `Domain`.
- Return intentional API status codes and use a consistent problem-details response for errors.

## TypeScript and React

- Keep TypeScript strict and avoid `any`; use `unknown` when a value requires validation or narrowing.
- Use functional components and hooks.
- Keep components small and extract reusable behaviour only when a concrete reuse case exists.
- Keep API access outside presentation components.
- Model server responses and component props with explicit types.
- Use PascalCase for components and their files, camelCase for functions and variables, and `use` prefixes for hooks.
- Handle loading, empty, error, and success states explicitly when displaying remote data.
- Maintain accessible labels, semantic elements, and keyboard interaction.

## User interface

- Prioritise the task the user came to complete. Keep screens direct and remove promotional or decorative copy that does not help with that task.
- Use a restrained visual system: flat colours, ordinary typography, clear spacing, simple surfaces, and consistent form controls.
- Do not introduce gradients, fabricated brand marks, oversized display text, decorative labels, split marketing panels, or heavy shadows unless an approved design specifically requires them.
- Keep form labels visible, inputs comfortably sized, focus states obvious, and validation messages adjacent to the relevant control.
- Do not render links, buttons, or menu items until their behaviour is implemented.
- Treat an approved visual reference as the source of truth for layout, colour, typography, and component styling.

## Testing

- Add or update tests with every behaviour change.
- Test observable behaviour and business rules rather than private implementation details.
- Name tests using `Member_Scenario_ExpectedResult`.
- Structure tests clearly as arrange, act, and assert.
- Keep unit tests deterministic and independent of external services.
- Use integration tests for database mappings, migrations, and API boundaries.
- A defect fix must include a test that fails without the fix whenever practical.

## Quality gates

Before committing backend changes, run:

```bash
dotnet format backend/PpecbAssessment.sln --verify-no-changes
dotnet build backend/PpecbAssessment.sln
dotnet test backend/PpecbAssessment.sln --no-build
```

Before committing frontend changes, run:

```bash
cd frontend
npm run lint
npm run build
```

When database configuration changes, also start SQL Server and confirm that it is healthy:

```bash
docker compose up -d --wait
docker compose ps
```

## Commit discipline

- Keep commits small, coherent, and independently buildable.
- Use an imperative commit subject that describes the outcome.
- Do not mix refactoring, formatting, and behaviour changes unless they are inseparable.
- Do not commit unfinished scaffolding for a future task.
