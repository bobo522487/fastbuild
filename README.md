# T3 Turbo - Modern Full-Stack Monorepo

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.20.0-brightgreen.svg)](https://nodejs.org/)
[![PNPM Version](https://img.shields.io/badge/pnpm-%3E%3D10.15.1-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2d3748.svg)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
>
> This is a production-ready T3 Turbo monorepo using **Next.js 15**, **React 19**, and **Better Auth** for authentication.
> Built with modern tooling including Biome for linting, Vitest for testing, and Prisma for database management.

## Quick Start

> [!IMPORTANT]
>
> **System Requirements:**
> - Node.js >= 22.20.0
> - PNPM >= 10.15.1
> - PostgreSQL database (or compatible with Prisma)

This template provides two ways to get started:

1. **Use as GitHub Template**: Click "Use this template" on the GitHub repository
2. **Use Turbo CLI**:

```bash
npx create-turbo@latest -e https://github.com/t3-oss/create-t3-turbo
```

## Tech Stack

This monorepo is built with a modern, production-ready stack:

### 🚀 Core Technologies
- **Next.js 15** - Full-stack React framework
- **React 19** - Latest React with concurrent features
- **Turborepo** - High-performance build system
- **TypeScript** - Type-safe development

### 🗄️ Database & ORM
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Production-ready database
- **Better Auth** - Modern authentication solution

### 🔧 Development Tools
- **Biome** - Fast formatter and linter
- **Vitest** - Modern testing framework
- **Tailwind CSS v4** - Utility-first CSS framework
- **tRPC v11** - End-to-end typesafe APIs
- **Pino** - Ultra-fast JSON logger with structured logging

### 📁 Project Structure

```text
├── apps/nextjs/           # Next.js application
├── packages/
│   ├── api/              # tRPC router & procedures
│   ├── auth/             # Authentication configuration
│   ├── db/               # Database schema & Prisma client
│   ├── logger/           # Structured logging (Pino)
│   ├── ui/               # Reusable UI components (shadcn/ui)
│   └── validators/      # Shared validation schemas
└── tooling/
    ├── biome/            # Shared linting/formatting config
    ├── tailwind/         # Shared Tailwind configuration
    └── typescript/       # Shared TypeScript config
```

> [!NOTE]
>
> In this template, we use `@acme` as a placeholder for package names. You can replace all instances with your organization name using:
> ```bash
> find . -type f -name "*.json" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.md" | xargs sed -i 's/@acme/@your-org/g'
> ```

## Installation & Setup

### 1. Environment Configuration

First, configure your environment variables:

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
# Required: Database URL, Auth secret, GitHub OAuth credentials
```

**Environment Variables:**
- `POSTGRES_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Better Auth secret (generate with `openssl rand -base64 32`)
- `AUTH_GITHUB_ID` - GitHub OAuth client ID
- `AUTH_GITHUB_SECRET` - GitHub OAuth client secret
- `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000`)

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push database schema (development)
pnpm db:push

# Or create a migration (production)
pnpm db:migrate
```

### 4. Authentication Setup

```bash
# Generate Better Auth schema
pnpm auth:generate
```

This will:
1. Read the Better Auth configuration from `packages/auth/script/auth-cli.ts`
2. Generate the database schema for authentication tables
3. Update the Prisma schema in `packages/db/`

> [!IMPORTANT]
>
> The authentication schema generation uses a separate CLI configuration file to prevent runtime imports. Always use `packages/auth/src/index.ts` for runtime authentication configuration.

### 5. Development Server

Start the development server:

```bash
# Start all services
pnpm dev

# Or start Next.js only
pnpm dev:next
```

Visit `http://localhost:3000` to see your application.

## Development Commands

### 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start all services in watch mode
pnpm dev:next         # Start Next.js only

# Building
pnpm build            # Build all packages
pnpm clean            # Clean all node_modules
pnpm clean:workspaces # Clean workspace builds

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database (dev)
pnpm db:migrate       # Create database migration
pnpm db:reset         # Reset database
pnpm db:push:test     # Reset test database using .env.test
pnpm db:reset:test    # Force reset test database using .env.test
pnpm db:studio        # Open Prisma Studio

# Authentication
pnpm auth:generate    # Generate Better Auth schema

# Code Quality
pnpm biome:check      # Run Biome linting
pnpm biome:fix        # Fix Biome issues
pnpm typecheck        # Run TypeScript type checking
pnpm lint:ws          # Check workspace dependencies

# Testing
pnpm test             # Run all tests
pnpm test:integration # Run API integration tests with .env.test
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage   # Run tests with coverage
pnpm test:ui          # Open Vitest UI
```

### 🎨 Adding UI Components

Add shadcn/ui components interactively:

```bash
pnpm ui-add
```

### 📦 Adding New Packages

Create a new package in the monorepo:

```bash
pnpm turbo gen init
```

This will prompt you for package details and automatically configure:
- `package.json` with proper workspace dependencies
- `tsconfig.json` extending shared configuration
- `index.ts` with proper exports
- Tooling integration (Biome, TypeScript, etc.)

## Database Management

### 🗄️ Schema & Models

The database schema is defined in [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma). It includes:

- **Authentication models** (User, Session, Account, Verification)
- **Application models** (Post, etc.)
- **Relations and constraints**

### 🔧 Database Operations

```typescript
import { prisma } from "@acme/db";

// Create a user
const user = await prisma.user.create({
  data: {
    name: "John Doe",
    email: "john@example.com",
    emailVerified: true,
  },
});

// Query with relations
const posts = await prisma.post.findMany({
  include: {
    user: true,
    comments: true,
  },
  orderBy: {
    createdAt: "desc",
  },
});

// Update with transaction
const updatedUser = await prisma.user.update({
  where: { id: user.id },
  data: { name: "Jane Doe" },
});
```

### 📊 Database Commands

| Command | Description | Environment |
|---------|-------------|-------------|
| `pnpm db:generate` | Generate Prisma client | All |
| `pnpm db:push` | Push schema to database | Development |
| `pnpm db:migrate` | Create migration | Production |
| `pnpm db:reset` | Reset database | Development |
| `pnpm db:studio` | Open database browser | All |

### 🔍 Schema Management Workflow

1. **Development**: `pnpm db:push` (instant schema updates)
2. **Production**: `pnpm db:migrate` (versioned migrations)
3. **Client Generation**: `pnpm db:generate` (after any schema change)

> [!TIP]
>
> Use `pnpm db:studio` to visually explore your database schema and data.

## 📋 Structured Logging

This project uses **Pino** for structured logging, providing machine-readable JSON logs that are essential for production monitoring and debugging.

### 📝 Log Format

```json
{
  "level": 30,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "pid": 12345,
  "hostname": "server-a",
  "service": "@acme/nextjs",
  "environment": "production",
  "correlationId": "abc-123-def-456",
  "msg": "User login successful",
  "context": {
    "userId": "user-42",
    "route": "/api/trpc/auth.login",
    "duration": 156
  }
}
```

### 🔧 Usage Examples

#### Server-side Logging
```typescript
import { createLogger, generateCorrelationId } from '@acme/logger';

// Create logger with context
const logger = createLogger({
  userId: session.user.id,
  route: '/api/trpc/post.create'
});

// Log different levels
logger.info('Post created successfully', { postId: '123' });
logger.warn('Rate limit approaching', { current: 8, limit: 10 });
logger.error('Database connection failed', { error: error.message });

// Performance logging
const start = Date.now();
await someOperation();
logger.info('Operation completed', {
  duration: Date.now() - start,
  operation: 'dataProcessing'
});
```

#### tRPC Integration
```typescript
import { loggerMiddleware } from '@acme/api/middleware/logger';

const postRouter = t.router({
  create: t.procedure
    .use(loggerMiddleware)
    .input(CreatePostSchema)
    .mutation(async ({ ctx, input }) => {
      // Automatic request/response logging
      return await createPost(ctx, input);
    }),
});
```

#### Database Query Logging
```typescript
import { prismaLoggingMiddleware } from '@acme/db/logger';

// All Prisma queries are automatically logged
const posts = await prisma.post.findMany({
  include: { user: true },
});

// Slow queries (>1s) are logged as warnings
```

#### Client-side Logging
```typescript
import { logger } from '@acme/logger/client';

// In React components
logger.info('Button clicked', { buttonId: 'submit-btn' });
logger.error('Form validation failed', { errors: validationErrors });

// React error boundaries
import { logReactError } from '@acme/logger/client';
```

### 🎯 Key Features

- **Correlation IDs**: Track requests across services
- **Environment-aware**: Pretty output in dev, JSON in production
- **Performance monitoring**: Automatic slow operation detection
- **Database monitoring**: Query logging and slow query detection
- **Error tracking**: Structured error logging with context
- **Client support**: Browser logging with batching

### 📊 Log Levels

| Level | Value | Use Case |
|-------|-------|----------|
| `trace` | 10 | Detailed debugging information |
| `debug` | 20 | Development debugging |
| `info` | 30 | General application events |
| `warn` | 40 | Warning conditions |
| `error` | 50 | Error conditions |
| `fatal` | 60 | Critical system failures |

### 🔍 Environment Variables

```bash
# Log level (development: debug, production: info)
LOG_LEVEL=info

# Enable/disable logging
NODE_ENV=production
```

### 📈 Integration with Monitoring Services

The structured JSON format works seamlessly with:
- **Datadog**: Log management and monitoring
- **New Relic**: APM and log analysis
- **Elastic Stack**: ELK for log aggregation
- **Grafana Loki**: Log querying and visualization
- **AWS CloudWatch**: Cloud-based log management

## Deployment

### 🚀 Deploy to Vercel

1. **Create Vercel Project**
   - Connect your GitHub repository
   - Set root directory to `apps/nextjs`
   - Vercel will automatically detect Next.js configuration

2. **Environment Variables**
   ```bash
   # Required environment variables
   POSTGRES_URL=your-production-database-url
   AUTH_SECRET=your-production-auth-secret
   AUTH_GITHUB_ID=your-github-client-id
   AUTH_GITHUB_SECRET=your-github-client-secret
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

3. **Build Configuration**
   - Build command: `pnpm build`
   - Output directory: `.next`
   - Install command: `pnpm install`

### 🔒 Security Considerations

- **Environment Variables**: Never commit secrets to version control
- **Database**: Use connection pooling in production
- **Authentication**: Configure proper CORS and origin validation
- **Dependencies**: Regularly update dependencies for security patches

### 🏗️ Production Checklist

- [ ] Configure production database
- [ ] Set up environment variables
- [ ] Enable authentication providers
- [ ] Configure domain and SSL
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test deployment in staging environment

## FAQ

### 🔍 Backend Code Safety

**Does this pattern leak backend code to client applications?**

No. The `@acme/api` package should only be a production dependency in the Next.js application. Other applications (Electron, mobile apps, etc.) should only add it as a dev dependency for type safety. This ensures backend code remains secure while providing full TypeScript support.

### 🗄️ Database Configuration

**What database systems are supported?**

This project uses Prisma ORM with PostgreSQL by default, but Prisma supports:
- PostgreSQL
- MySQL
- SQLite
- MongoDB
- SQL Server
- CockroachDB

To change databases:
1. Update `DATABASE_URL` in `.env`
2. Modify `packages/db/prisma/schema.prisma` provider
3. Update Prisma client generation

### 📝 Schema Modifications

**How do I modify the database schema?**

1. Edit `packages/db/prisma/schema.prisma`
2. Run `pnpm db:generate` to update types
3. Development: `pnpm db:push`
4. Production: `pnpm db:migrate`

### 🔧 Authentication Issues

**Common authentication problems:**

- **OAuth not working**: Check GitHub OAuth credentials and redirect URLs
- **Session issues**: Verify `AUTH_SECRET` is properly generated
- **CORS errors**: Configure allowed origins in Better Auth settings

### 🚀 Performance Optimization

**Production performance tips:**

- Enable database connection pooling
- Use Next.js ISR for static content
- Implement proper caching strategies
- Monitor bundle sizes and optimize imports
- Use Prisma query optimization

## Troubleshooting

### Common Issues

#### Installation Problems
```bash
# Clear all dependencies and reinstall
pnpm clean
pnpm install
```

#### Database Connection Issues
```bash
# Verify database is running
pnpm db:studio

# Reset database (development only)
pnpm db:reset
```

#### Authentication Setup
```bash
# Regenerate auth schema
pnpm auth:generate

# Check environment variables
cat .env
```

### 🆘 Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check individual package READMEs
- **Community**: Join discussions in the repository

---

## 📚 References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Biome Documentation](https://biomejs.dev/docs/introduction)
- [Vitest Documentation](https://vitest.dev/guide/)
