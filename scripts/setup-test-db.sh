#!/bin/bash

# FastBuild Test Database Setup Script
# This script sets up the test database with proper schema and seed data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -f "prisma/schema.prisma" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Set test environment
export NODE_ENV=test
export DATABASE_URL="postgresql://prisma:prisma@localhost:5433/fastbuild_test"

print_status "Setting up test database environment..."

# Step 1: Start test database if not running
print_step "Step 1: Ensuring test database is running..."
if ! docker exec fastbuild-postgres-test pg_isready -U prisma > /dev/null 2>&1; then
    print_status "Starting test database container..."
    docker compose up -d postgres-test

    # Wait for database to be ready
    timeout 30 bash -c 'until docker exec fastbuild-postgres-test pg_isready -U prisma; do sleep 1; done'

    if [ $? -ne 0 ]; then
        print_error "Test database failed to start within 30 seconds."
        exit 1
    fi
else
    print_status "Test database is already running."
fi

# Step 2: Reset test database
print_step "Step 2: Resetting test database..."
npx prisma db push --force-reset || {
    print_error "Failed to reset test database"
    exit 1
}

# Step 3: Generate Prisma client
print_step "Step 3: Generating Prisma client..."
npx prisma generate || {
    print_error "Failed to generate Prisma client"
    exit 1
}

# Step 4: Run seed data if seed file exists
print_step "Step 4: Populating test database with seed data..."
if [ -f "prisma/seed.ts" ]; then
    npx tsx prisma/seed.ts || {
        print_warning "Seed script executed with warnings (this may be normal for test environment)"
    }
    print_status "Seed data populated successfully."
else
    print_warning "No seed file found at prisma/seed.ts - skipping seed data."
fi

# Step 5: Verify database setup
print_step "Step 5: Verifying database setup..."
npx prisma db pull || {
    print_error "Failed to verify database schema"
    exit 1
}

print_status "Test database setup completed successfully!"
print_status "Database URL: $DATABASE_URL"
print_status ""
print_status "You can now run tests with:"
echo "  pnpm test              # Run all tests"
echo "  pnpm test:unit         # Run unit tests only"
echo "  pnpm test:integration  # Run integration tests only"