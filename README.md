# PPECB Developer Assessment

A full-stack product catalogue system developed for the PPECB Developer Assessment. The repository contains an ASP.NET Core backend, a React frontend, and a containerised SQL Server development database.

## Technology stack

| Area | Technology |
| --- | --- |
| Backend | C#, .NET 8, ASP.NET Core Web API |
| Frontend | React, TypeScript, Vite |
| Database | Microsoft SQL Server 2022 |
| Testing | xUnit |
| Local infrastructure | Docker Compose |

## Architecture

The backend follows a layered architecture with dependencies directed towards the domain:

```text
Api ───────────────► Application
 │                        │
 └──► Infrastructure ─────┤
              │           │
              └──────────► Domain
```

| Project | Responsibility | Dependencies |
| --- | --- | --- |
| `PpecbAssessment.Domain` | Domain entities and business rules | None |
| `PpecbAssessment.Application` | Application use cases and contracts | Domain |
| `PpecbAssessment.Infrastructure` | Persistence and external service implementations | Application, Domain |
| `PpecbAssessment.Api` | HTTP API and application composition | Application, Infrastructure |
| `PpecbAssessment.Tests` | Unit and integration tests | Production projects under test |

The test project is outside the production dependency chain.

## Repository structure

```text
.
├── backend
│   ├── PpecbAssessment.sln
│   ├── src
│   │   ├── PpecbAssessment.Domain
│   │   ├── PpecbAssessment.Application
│   │   ├── PpecbAssessment.Infrastructure
│   │   └── PpecbAssessment.Api
│   └── tests
│       └── PpecbAssessment.Tests
├── frontend
├── docs
├── docker-compose.yml
└── global.json
```

## Prerequisites

- .NET SDK 8
- Node.js 22.12 or newer
- Docker with Docker Compose
- Git

Confirm the required tools are available:

```bash
dotnet --version
node --version
npm --version
docker compose version
```

## Getting started

Clone the repository:

```bash
git clone https://github.com/mthobisi30/ppecb-developer-assessment.git
cd ppecb-developer-assessment
```

### Configure the database

Create the local environment file:

```bash
cp .env.example .env
```

Replace the example `MSSQL_SA_PASSWORD` value in `.env` with a strong local password. The local environment file is excluded from Git.

Available settings:

| Variable | Description | Default example |
| --- | --- | --- |
| `MSSQL_SA_PASSWORD` | SQL Server system administrator password | Set in `.env` |
| `SQLSERVER_PORT` | SQL Server port exposed on the host | `1433` |

Start SQL Server and wait for it to become healthy:

```bash
docker compose up -d --wait
docker compose ps
```

### Backend

Restore, build, and test the .NET solution:

```bash
dotnet restore backend/PpecbAssessment.sln
dotnet build backend/PpecbAssessment.sln --no-restore
dotnet test backend/PpecbAssessment.sln --no-build
```

Run the API:

```bash
dotnet run --project backend/src/PpecbAssessment.Api
```

The development profile serves the API at `http://localhost:5080`.

### Frontend

Install the frontend dependencies:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite prints the local frontend address when the server starts.

Run the frontend quality checks:

```bash
npm run lint
npm run build
```

## Database persistence

SQL Server stores its database files in the named Docker volume `ppecb-assessment_sqlserver-data`. Stopping or recreating the container does not remove the stored data.

Stop the development database while retaining its data:

```bash
docker compose down
```

To remove the container and its database volume:

```bash
docker compose down --volumes
```

The second command permanently removes the local database data.
