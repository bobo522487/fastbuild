"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test setup for tRPC infrastructure tests
const vitest_1 = require("vitest");
// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fastbuild_test';
// Mock console methods in tests to reduce noise
console.log = vitest_1.vi.fn();
console.error = vitest_1.vi.fn();
console.warn = vitest_1.vi.fn();
console.info = vitest_1.vi.fn();
// Setup global test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vitest_1.vi;
