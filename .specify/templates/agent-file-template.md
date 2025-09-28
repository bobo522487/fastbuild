# FastBuild Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-15

## Active Technologies
- **tRPC**: Type-safe API layer with end-to-end TypeScript integration
- **Zod**: Schema validation and type definition (single source of truth)
- **Prisma**: Type-safe ORM with PostgreSQL database
- **Next.js 15**: Full-stack framework with App Router
- **React Hook Form**: High-performance form state management
- **shadcn/ui**: Customizable component library with Tailwind CSS v4
- **pnpm**: Package manager with workspace support
- **Docker**: Containerized development environment

## Project Structure
```
fastbuild/
├── apps/web/                    # Next.js application
│   ├── app/                     # App Router pages
│   │   ├── api/                # API routes (tRPC integration)
│   │   └── forms/              # Form pages
│   ├── components/             # App-specific components
│   └── lib/                    # Utility functions
├── packages/
│   ├── api/                    # tRPC routers and procedures
│   │   ├── src/
│   │   │   ├── routers/        # Feature routers (form, auth, submission)
│   │   │   ├── procedures/     # Reusable procedures
│   │   │   ├── context.ts      # tRPC context configuration
│   │   │   └── trpc.ts         # tRPC instance configuration
│   ├── ui/                     # shadcn/ui components
│   ├── database/               # Prisma client and utilities
│   ├── schema-compiler/        # Form metadata → Zod conversion
│   └── contracts/              # API contracts and test cases
├── prisma/                     # Database schema and migrations
├── specs/                      # Feature specifications and plans
└── docs/                       # Documentation
```

## Commands
### Development
```bash
pnpm dev                      # Start all development servers
pnpm build                    # Build all packages and apps
pnpm lint                     # Lint all packages
pnpm typecheck                # TypeScript type checking
```

### Database
```bash
docker compose up -d          # Start PostgreSQL
pnpm db:push                  # Push schema changes
pnpm db:generate              # Generate Prisma client
pnpm db:migrate               # Create migration
pnpm db:studio                # Open Prisma Studio
```

### Testing
```bash
pnpm test:contracts           # Run API contract tests
pnpm test:integration         # Run integration tests
pnpm test:e2e                 # Run end-to-end tests
```

## Code Style
### TypeScript
- **Strict mode enabled**: No implicit any, strict null checks
- **Function components**: Use function syntax with React.FC only when necessary
- **Type imports**: Use `import type` for type-only imports
- **Zod integration**: All API inputs/outputs must use Zod schemas

### tRPC Patterns
```typescript
// Router structure
export const formRouter = router({
  list: publicProcedure
    .input(formRouterContracts.list.input)
    .output(formRouterContracts.list.output)
    .query(async ({ input, ctx }) => {
      // Implementation
    }),
});

// Context usage
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,
    prisma,
    user: null, // Will be populated by auth middleware
  };
}
```

### React Patterns
```typescript
// tPC integration in components
const { data: forms, isLoading } = trpc.form.list.useQuery({
  limit: 20,
  search: '',
});

// Form handling with React Hook Form + Zod
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
});
```

### Database Patterns
```typescript
// Prisma queries with proper includes
const form = await prisma.form.findUnique({
  where: { id },
  include: {
    creator: true,
    submissions: {
      take: 10,
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

## Recent Changes
### tRPC Infrastructure (v1.0.0)
- **Added**: Type-safe API layer with tRPC v10
- **Added**: API contract testing with Zod schemas
- **Added**: Comprehensive router structure for forms, submissions, and auth
- **Improved**: End-to-end type safety from database to frontend

### Constitution-Driven Development (v1.0.0)
- **Added**: Project constitution with 5 core principles
- **Added**: Template alignment with constitutional requirements
- **Improved**: Development workflow governance

### Monorepo Foundation (v0.4.0)
- **Added**: pnpm workspace structure
- **Added**: shadcn/ui component library
- **Added**: Prisma + PostgreSQL integration
- **Added**: Schema compiler for dynamic form generation

<!-- MANUAL ADDITIONS START -->
## Constitutional Compliance
All development must follow the FastBuild Constitution principles:

1. **Schema-First Architecture**: Zod as single source of truth
2. **Type Safety Non-Negotiable**: End-to-end TypeScript integration
3. **Monorepo First**: Coordinated versioning and testing
4. **Test-Driven Development**: Contract tests before implementation
5. **Performance by Design**: Optimization from day one

## Security Requirements
- Input validation via Zod schemas
- Authentication via JWT tokens
- Authorization via user roles (ADMIN/USER)
- SQL injection prevention via Prisma ORM
- XSS prevention via React escaping
<!-- MANUAL ADDITIONS END -->