# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastBuild is an open-source low-code development platform built on Next.js 15 full-stack architecture. The project enables users to create and deploy web applications through visual interfaces with end-to-end type safety. This is a T3 Stack application with modern tooling and a monolithic architecture designed for simplicity and performance.

## Core Technology Stack

- **Framework**: Next.js 15.5.4 with App Router (React 19.2.0)
- **Language**: TypeScript 5.9.3 with strict configuration
- **Database**: PostgreSQL 18 with Prisma ORM 6.17.0
- **API**: REST API with Next.js API Routes + Swagger/OpenAPI 3.1 documentation
- **API Testing**: Jest + Supertest for API contract testing
- **Styling**: Tailwind CSS 4.1.14 with custom components
- **UI Components**: Radix UI primitives with custom implementations
- **Code Quality**: Biome 1.9.4 for linting and formatting
- **Package Manager**: pnpm 10.18.2

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

### Testing Commands
```bash
pnpm test              # Run all tests
pnpm test:unit         # Run unit tests only
pnpm test:integration  # Run integration tests only
pnpm test:run          # Run tests in CI mode
pnpm test:coverage     # Run tests with coverage report
pnpm test:ui           # Run tests with UI interface
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

FastBuild follows a **low-code platform architecture** with **dynamic table generation** at its core, built on Linus Torvalds' "good taste" design philosophy:

1. **Metadata Layer**: User-defined table structures stored as metadata
2. **Dynamic DDL Layer**: Real database tables generated from metadata using unified Prisma SQL API
3. **View System Layer**: Intelligent views (simple → materialized) for data access
4. **Application Layer**: Visual app builder consuming generated data models

### Key Architectural Patterns

**DDL-Mode Architecture**: The platform uses **dynamic table generation** instead of EAV patterns:
- Real PostgreSQL tables are created from user metadata (`project_{projectId}_{tableName}`)
- Metadata represents user design assets (critical for low-code platforms)
- Unified Prisma SQL API (`$executeRawUnsafe`, `$queryRaw`) replaces direct pg.Client connections
- Prisma Migrate provides version control for all DDL operations

**Unified Prisma Architecture**: All database operations use a single, consistent API:
- `TableService`: Handles metadata + real table creation in single transactions
- `PrismaMigrateService`: Versioned DDL management with rollback capability
- `UnifiedQueryBuilder`: Type-safe SQL generation with simplified security validation
- `MigrationHistory`: Complete audit trail of all schema changes

**Three-Layer to Single-Layer Simplification** (Linus-style optimization):
- Security validation: From 3-layer complex system → 1-layer simple validation
- Consistency checking: From 1500+ line checker → transactional metadata operations
- View refresh: From complex queue scheduling → simple timer-based refresh

**REST API Design**: Standard RESTful endpoints with OpenAPI documentation:
- `/api/projects/*` - Project management
- `/api/data-models/*` - Dynamic table creation and management
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
The application uses Prisma with PostgreSQL in **DDL mode**. Core models include:
- **User/Project/ProjectMember**: Standard multi-tenant architecture with RBAC
- **DataTable/DataColumn**: Metadata for user-defined table structures
- **TableView**: Custom views over generated tables (simple + materialized)
- **MigrationHistory**: Complete audit trail of all DDL operations via Prisma Migrate
- **Application/AppVersion/AppDeployment**: Application management and deployment

**Dynamic Table Generation**: Real PostgreSQL tables follow naming pattern `project_{projectId}_{tableName}` and are created via unified Prisma SQL API with full transactional consistency.

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

### Working with Dynamic Tables (Low-Code Platform)
The platform creates real database tables from user metadata. Key patterns:

**Table Creation via Unified API**:
```typescript
// All DDL operations go through PrismaMigrateService
await PrismaMigrateService.createAndApplyMigration(
  'create_table_project_xyz_users',
  [createTableSQL],
  { projectId: 'xyz', tableName: 'users', operation: 'CREATE_TABLE' }
);
```

**Data Access via Unified Query Builder**:
```typescript
// Use UnifiedQueryBuilder for type-safe SQL generation
const data = await UnifiedQueryBuilder.buildDataQuery(
  'users',
  'project_xyz',
  { filters: [{ field: 'email', operator: 'eq', value: 'user@example.com' }] }
);
```

**Important**: Never use direct pg.Client connections. All database operations must use the unified Prisma SQL API (`$executeRawUnsafe`, `$queryRaw`) to maintain transaction consistency and connection pool management.

### Architecture Decision: Why DDL Mode vs EAV

This platform intentionally uses **dynamic table generation (DDL mode)** instead of Entity-Attribute-Value (EAV) patterns:

**DDL Mode Benefits**:
- **Performance**: Real tables with proper indexes, constraints, and PostgreSQL optimizations
- **Scalability**: Native SQL performance for large datasets and complex queries
- **Data Integrity**: Database-enforced constraints and relationships
- **Familiarity**: Standard SQL patterns that developers understand

**Why Metadata + Real Tables**:
- **User Assets**: Metadata represents user design content and must be preserved
- **Version Control**: Prisma Migrate provides complete DDL history and rollback capability
- **Atomic Operations**: Metadata and actual tables created in single transactions
- **Low-Code Power**: Users get visual design while maintaining enterprise database performance

**Critical**: Always maintain the separation between metadata (Prisma models) and user-generated business data (dynamic tables). Never mix the two concepts.

## Project Context

This is a low-code development platform implementing **dynamic table generation** architecture. The codebase follows Linus Torvalds' "good taste" design philosophy with emphasis on simplicity over complexity. The platform creates real database tables from user metadata, providing both the flexibility of visual development and the power of traditional database performance.

**Recent Major Optimization**: Transitioned from mixed pg.Client + Prisma connections to **unified Prisma SQL API** architecture, eliminating connection management complexity and providing transactional consistency between metadata and actual table structures.

## Important Notes

- Always run `pnpm typecheck` before committing changes
- Use Biome for consistent code formatting (configured in `biome.jsonc`)
- The project uses path aliases with `~/` prefix pointing to `src/`
- Database runs on PostgreSQL via Docker container (see `start-database.sh`)
- Environment variables should be set in `.env` following `.env.example`
- API documentation is available at `/api/docs` when development server is running
- **Critical**: Never use direct pg.Client connections - always use unified Prisma SQL API
- **Architecture**: Dynamic table generation mode - metadata drives real table creation
- **Transactions**: All DDL operations use Prisma Migrate for version control and rollback

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