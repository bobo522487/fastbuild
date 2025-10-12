#!/bin/bash

# FastBuild Database Startup Script
# This script starts the appropriate database containers for development or testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Parse command line arguments
ENVIRONMENT=${1:-"development"}

case $ENVIRONMENT in
    "development"|"dev")
        print_status "Starting development database..."
        docker compose up -d postgres

        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        timeout 30 bash -c 'until docker exec fastbuild-postgres pg_isready -U postgres; do sleep 1; done'

        if [ $? -eq 0 ]; then
            print_status "Development database is ready!"
            print_status "Database URL: postgresql://postgres:password@localhost:5432/fastbuild"
        else
            print_error "Database failed to start within 30 seconds."
            exit 1
        fi
        ;;

    "test"|"testing")
        print_status "Starting test database..."
        docker compose up -d postgres-test

        # Wait for test database to be ready
        print_status "Waiting for test database to be ready..."
        timeout 30 bash -c 'until docker exec fastbuild-postgres-test pg_isready -U prisma; do sleep 1; done'

        if [ $? -eq 0 ]; then
            print_status "Test database is ready!"
            print_status "Database URL: postgresql://prisma:prisma@localhost:5433/fastbuild_test"
        else
            print_error "Test database failed to start within 30 seconds."
            exit 1
        fi
        ;;

    "both"|"all")
        print_status "Starting both development and test databases..."
        docker compose up -d postgres postgres-test

        # Wait for both databases to be ready
        print_status "Waiting for development database to be ready..."
        timeout 30 bash -c 'until docker exec fastbuild-postgres pg_isready -U postgres; do sleep 1; done'

        print_status "Waiting for test database to be ready..."
        timeout 30 bash -c 'until docker exec fastbuild-postgres-test pg_isready -U prisma; do sleep 1; done'

        if [ $? -eq 0 ]; then
            print_status "Both databases are ready!"
            print_status "Development DB: postgresql://postgres:password@localhost:5432/fastbuild"
            print_status "Test DB: postgresql://prisma:prisma@localhost:5433/fastbuild_test"
        else
            print_error "One or both databases failed to start within 30 seconds."
            exit 1
        fi
        ;;

    "stop")
        print_status "Stopping all database containers..."
        docker compose down
        print_status "All databases stopped."
        ;;

    *)
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [development|test|both|stop]"
        echo ""
        echo "Options:"
        echo "  development, dev  - Start development database only"
        echo "  test, testing     - Start test database only"
        echo "  both, all         - Start both databases"
        echo "  stop              - Stop all databases"
        exit 1
        ;;
esac