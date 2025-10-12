import { vi } from "vitest";

// bcrypt mock configuration
export const createMockBcrypt = () => {
	// Mock password hashing
	const mockHash = vi
		.fn()
		.mockImplementation(async (passwordHash: string, saltRounds = 10) => {
			// Return a consistent hash for the same password for predictable testing
			return `hashed_${password}_${saltRounds}`;
		});

	// Mock password comparison
	const mockCompare = vi
		.fn()
		.mockImplementation(async (passwordHash: string, hash: string) => {
			// Extract the original password from the hash
			const extractedPassword = hash
				.replace("hashed_", "")
				.replace(/_\\d+$/, "");
			return password === extractedPassword;
		});

	// Mock salt generation
	const mockGenSalt = vi.fn().mockImplementation(async (saltRounds = 10) => {
		return `salt_${saltRounds}_${Math.random().toString(36).substring(7)}`;
	});

	return {
		hash: mockHash,
		compare: mockCompare,
		genSalt: mockGenSalt,
		// Helper functions for common test scenarios
		mockHashSuccess: (passwordHash: string) => {
			mockHash.mockResolvedValue(`hashed_${password}_10`);
		},
		mockHashFailure: (error: Error) => {
			mockHash.mockRejectedValue(error);
		},
		mockCompareSuccess: () => {
			mockCompare.mockResolvedValue(true);
		},
		mockCompareFailure: () => {
			mockCompare.mockResolvedValue(false);
		},
	};
};

export const { hash, compare, genSalt } = createMockBcrypt();
