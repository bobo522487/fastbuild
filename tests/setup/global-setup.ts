// Global setup file for Vitest
// This runs before all tests and in a separate context

// Set up global test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Global setup can optionally export an async function
export default async function globalSetup() {
  // Any global setup that needs to run before all tests
  console.log('Global test environment setup complete');
}