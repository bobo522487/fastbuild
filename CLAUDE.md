# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastBuild is an open-source low-code development platform built on Next.js 15 full-stack architecture. The project enables users to create and deploy web applications through visual interfaces with end-to-end type safety. This is a T3 Stack application with modern tooling and a monolithic architecture designed for simplicity and performance.

## Core Technology Stack

- **Framework**: Next.js 15.5.4 with App Router (React 19.2.0)
- **Language**: TypeScript 5.9.3 with strict configuration
- **Database**: PostgreSQL with Prisma ORM 6.17.0
- **Authentication**: NextAuth.js 5.0.0-beta.25 with multiple providers (Google, GitHub, email/password)
- **API**: REST API with Next.js API Routes + Swagger/OpenAPI 3.0 documentation
- **API Testing**: Jest + Supertest for API contract testing
- **Styling**: Tailwind CSS 4.1.14 with custom components
- **UI Components**: Radix UI primitives with custom implementations
- **Code Quality**: Biome 1.9.4 for linting and formatting
- **Package Manager**: pnpm 9.15.4

*Note: Some versions may be newer than those listed in package.json due to automatic updates during installation.*

## Key Commands

### Development
```bash
pnpm dev              # Start development server with Turbo
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and preview production
```

### Database Operations
```bash
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate Prisma client and run migrations
pnpm db:migrate       # Deploy migrations to production
pnpm db:studio        # Open Prisma Studio for database inspection
```

### Code Quality
```bash
pnpm check            # Run Biome linter and formatter checks
pnpm check:write      # Auto-fix linting and formatting issues
pnpm check:unsafe     # Apply unsafe Biome fixes (use with caution)
pnpm typecheck        # Run TypeScript type checking without emit
```

### Database Setup
```bash
./start-database.sh   # Start PostgreSQL database (uses Docker)
```

## Environment Setup

### Prerequisites
- Node.js (v18+) and pnpm installed
- Docker or Docker Desktop for database container
- Git for version control

### Initial Setup

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd fastbuild
pnpm install
```

2. **Environment configuration**:
```bash
cp .env.example .env
# Edit .env with your configuration:
# - AUTH_SECRET: Generate with `npx auth secret`
# - AUTH_GITHUB_ID/SECRET: Create GitHub OAuth app
# - DATABASE_URL: PostgreSQL connection string
```

3. **Start the database**:
```bash
./start-database.sh
# This starts a PostgreSQL container using Docker
# Database: postgresql://postgres:password@localhost:5432/fastbuild
```

4. **Initialize the database**:
```bash
pnpm db:push          # Push schema to database
pnpm postinstall      # Generate Prisma client
```

5. **Start development server**:
```bash
pnpm dev              # Start with Turbo for faster builds
# Visit http://localhost:3000
```

### Database Management
- **View data**: `pnpm db:studio` (opens Prisma Studio)
- **Reset database**: Delete and recreate all data
- **Schema changes**: Modify `prisma/schema.prisma`, then run `pnpm db:push`

## Architecture Overview

### Big Picture Architecture

FastBuild follows a **layered REST API architecture** with separation of concerns between data models, applications, and deployments:

1. **Data Model Layer**: Enterprise-level version management for database schemas
2. **Application Layer**: Visual app builder with version control and dependency management
3. **Deployment Layer**: Multi-platform deployment management for user applications

### Key Architectural Patterns

**Version Separation**: Data models and applications have independent versioning systems
- `DataModelVersion`: Manages database schema evolution
- `AppVersion`: Manages application logic and UI evolution
- `AppDeployment`: Manages deployment instances across environments

**Enterprise Data Model**: The platform uses a sophisticated multi-tenant architecture:
- Projects contain data models and applications
- Data models define tables, relations, and views with JSONB snapshots
- Applications depend on specific data model versions
- Support for draft modes and version publishing workflows

**REST API Design**: Standard RESTful endpoints with OpenAPI documentation:
- `/api/projects/*` - Project management
- `/api/data-models/*` - Data model versioning
- `/api/applications/*` - Application management
- `/api/deployments/*` - Deployment lifecycle
- `/api/docs` - Interactive Swagger UI

### Directory Structure
```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # REST API endpoints (replacing tRPC)
│   │   ├── auth/       # NextAuth routes
│   │   ├── projects/   # Project management APIs
│   │   ├── data-models/# Data model versioning APIs
│   │   ├── applications/# Application management APIs
│   │   ├── deployments/ # Deployment management APIs
│   │   └── docs/       # Swagger/OpenAPI documentation
│   ├── _components/    # Page-specific components
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # Reusable UI components
│   └── ui/            # Base UI components (buttons, forms, etc.)
├── server/            # Backend code
│   ├── api/           # REST API handlers and middleware
│   │   ├── handlers/  # API route handlers
│   │   ├── middleware/# Auth, validation, CORS, error handling
│   │   └── openapi/   # OpenAPI schema and documentation
│   ├── auth/          # Authentication configuration
│   └── db.ts          # Database connection and Prisma client
├── lib/               # Utility functions and shared code
├── types/             # TypeScript type definitions
└── styles/            # Global styles
```

### Data Models
The application uses Prisma with PostgreSQL. Core enterprise models include:
- **User**: Authentication and user management
- **Project**: Multi-tenant project containers
- **DataModelVersion/DataModelDraft**: Version-controlled database schemas
- **Application/AppVersion**: Version-controlled application definitions
- **AppDeployment**: Deployment instances across environments
- **ProjectMember**: RBAC role-based access control

### API Architecture
- **REST API**: Standard HTTP methods with proper status codes and error handling
- **OpenAPI 3.0**: Auto-generated documentation at `/api/docs`
- **Middleware Chain**: Authentication → Validation → Business Logic → Response
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Type Safety**: Request/response validation with Zod schemas

### Authentication Flow
- NextAuth.js handles authentication with multiple providers
- Session data available in API routes and React components
- Protected routes use middleware to verify authentication
- Project-level permissions enforced through ProjectMember roles

## Development Patterns

### Adding New REST API Endpoints
1. Create route handler in `src/app/api/[resource]/route.ts`
2. Implement HTTP methods (GET, POST, PUT, DELETE)
3. Add request/response validation with Zod schemas
4. Update OpenAPI schema in `src/server/api/openapi/schema.ts`
5. Add tests in appropriate test directory

### Creating UI Components
1. Base components in `src/components/ui/` follow Radix UI patterns
2. Use `class-variance-authority` for variant styling
3. Import utilities from `src/lib/utils.ts`
4. Follow existing naming convention and TypeScript patterns

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `pnpm db:push` for development changes
3. Use `pnpm db:generate` for production migrations
4. Always regenerate Prisma client after schema changes
5. Update related TypeScript types in `src/types/`

## Project Context

This is currently in early development phase as a low-code platform transitioning from tRPC to REST API architecture. The codebase follows T3 Stack conventions and maintains high standards for type safety and developer experience. The project aims to become a visual development platform while maintaining the power and flexibility of traditional coding.

## Important Notes

- Always run `pnpm typecheck` before committing changes
- Use Biome for consistent code formatting (configured in `biome.jsonc`)
- The project uses path aliases with `~/` prefix pointing to `src/`
- Database runs on PostgreSQL via Docker container (see `start-database.sh`)
- Environment variables should be set in `.env` following `.env.example`
- API documentation is available at `/api/docs` when development server is running
- The project is transitioning from tRPC to REST API - new code should use REST patterns

## Troubleshooting

### Common Issues

1. **Database connection fails**:
   - Ensure Docker is running: `docker ps`
   - Check if database container is up: `./start-database.sh`
   - Verify DATABASE_URL in .env matches container settings

2. **Prisma client generation errors**:
   - Run `pnpm postinstall` to regenerate client
   - Check schema.prisma for syntax errors

3. **TypeScript errors after dependency updates**:
   - Clear TypeScript cache: `rm -rf .next`
   - Rebuild: `pnpm build`

4. **Authentication not working**:
   - Verify AUTH_SECRET is set: `npx auth secret` to generate new one
   - Check NextAuth configuration in src/server/auth/
   - Ensure callback URLs match OAuth app settings

5. **API documentation not showing**:
   - Ensure development server is running: `pnpm dev`
   - Visit `/api/docs` for Swagger UI
   - Check OpenAPI schema generation in `src/server/api/openapi/`