# @fastbuild/db

Database package for the T3 Turbo monorepo, powered by Prisma ORM.

## Features

- **Prisma ORM**: Modern, type-safe database access
- **Full TypeScript Support**: Complete type safety and autocompletion
- **Database Migrations**: Robust schema management with Prisma Migrate
- **Database Studio**: Visual database browser with Prisma Studio
- **Environment Configuration**: Flexible configuration via environment variables

## Database Schema

### Authentication Tables
- `User` - User accounts with email verification
- `Session` - User sessions for authentication
- `Account` - OAuth provider accounts (GitHub, etc.)
- `Verification` - Email verification tokens

### Application Tables
- `Post` - Blog posts with user relationships

## Configuration

Add the following environment variables to your `.env` file:

```bash
# Database connection
DATABASE_URL="your-database-connection-string"
```

## Usage

### Using Prisma Directly (Recommended)

```typescript
import { prisma, type User, type Post } from "@fastbuild/db";

// Create a user
const user = await prisma.user.create({
  data: {
    name: "John Doe",
    email: "john@example.com",
    emailVerified: true,
  },
});

// Get posts with user data
const posts = await prisma.post.findMany({
  include: { user: true },
});

// Get user by email
const user = await prisma.user.findUnique({
  where: { email: "john@example.com" },
});

// Update user
const updatedUser = await prisma.user.update({
  where: { id: user.id },
  data: { name: "Jane Doe" },
});
```

### Using Convenience Types

```typescript
import { type User, type Post } from "@fastbuild/db";

// Use predefined types in your application
function createUserData(data: Omit<User, "id" | "createdAt" | "updatedAt">) {
  return data;
}
```

## Available Scripts

### Database Operations
```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes to database (development)
pnpm db:push

# Run Prisma Studio (database browser)
pnpm db:studio

# Run database migrations
pnpm db:migrate

# Reset database (development)
pnpm db:reset
```

### Build and Development
```bash
# Build the package
pnpm build

# Run type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## Database Schema

### User Model
```typescript
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  emailVerified Boolean  @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  accounts  Account[]
  sessions  Session[]
  posts     Post[]

  @@map("user")
}
```

### Post Model
```typescript
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("post")
}
```

## Best Practices

1. **Always use Prisma Client**: Import `prisma` directly for best performance and type safety
2. **Generate Client After Schema Changes**: Run `pnpm db:generate` after modifying `prisma/schema.prisma`
3. **Use Database Transactions**: For multiple operations, use `prisma.$transaction()`
4. **Handle Errors Gracefully**: Wrap database operations in try-catch blocks
5. **Use Selective Queries**: Specify `select` or `include` to optimize queries

## Error Handling

```typescript
import { prisma } from "@fastbuild/db";

try {
  const user = await prisma.user.findUnique({
    where: { email: "user@example.com" },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
} catch (error) {
  console.error("Database error:", error);
  throw error;
}
```

## Development

### Adding New Tables

1. **Update Schema**: Add your model to `prisma/schema.prisma`
2. **Generate Migration**: Run `pnpm db:migrate` (production) or `pnpm db:push` (development)
3. **Generate Client**: Run `pnpm db:generate`
4. **Use in Code**: Import and use with `prisma.yourModel`

### Example: Adding a New Model

```prisma
// prisma/schema.prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("comment")
}
```

```typescript
// Usage in application
const comment = await prisma.comment.create({
  data: {
    content: "Great post!",
    postId: "post-id",
    userId: "user-id",
  },
});
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure `DATABASE_URL` is correctly configured and accessible
2. **Schema Mismatch**: Run `pnpm db:generate` after schema changes
3. **Migration Conflicts**: Use `pnpm db:migrate reset` for development (this will delete all data)
4. **Type Errors**: Make sure to regenerate the Prisma client after schema changes

### Getting Help

- Check Prisma documentation: https://www.prisma.io/docs
- Use Prisma Studio to visualize data: `pnpm db:studio`
- Enable query debugging: Set `LOG_LEVEL=debug` in environment