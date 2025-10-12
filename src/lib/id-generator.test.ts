/**
 * ID生成器单元测试
 * 测试nanoid ID生成的各种场景
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FastBuildIdGenerator, ID_GENERATORS, generateIdForEntity, ValidPrefix } from './id-generator';

describe('FastBuildIdGenerator', () => {
	describe('generateShortId', () => {
		it('generates ID with correct format', () => {
			const id = FastBuildIdGenerator.generateShortId('test');

			expect(id).toMatch(/^test_[\w-]{8}$/);
			expect(id.length).toBe(13); // 'test_' + 8 characters
		});

		it('generates unique IDs', () => {
			const id1 = FastBuildIdGenerator.generateShortId('test');
			const id2 = FastBuildIdGenerator.generateShortId('test');

			expect(id1).not.toBe(id2);
		});

		it('supports custom length', () => {
			const id = FastBuildIdGenerator.generateShortId('test', 12);

			expect(id).toMatch(/^test_[\w-]{12}$/);
			expect(id.length).toBe(17); // 'test_' + 12 characters
		});

		it('throws error for empty prefix', () => {
			expect(() => FastBuildIdGenerator.generateShortId('')).toThrow('ID prefix cannot be null or empty');
			expect(() => FastBuildIdGenerator.generateShortId('   ')).toThrow('ID prefix cannot be null or empty');
		});

		it('throws error for null prefix', () => {
			expect(() => FastBuildIdGenerator.generateShortId(null as any)).toThrow('ID prefix cannot be null or empty');
		});
	});

	describe('Entity-specific ID generators', () => {
		it('generates valid user IDs', () => {
			const userId = FastBuildIdGenerator.generateUserId();

			expect(userId).toMatch(/^user_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(userId, 'user')).toBe(true);
		});

		it('generates valid project IDs', () => {
			const projectId = FastBuildIdGenerator.generateProjectId();

			expect(projectId).toMatch(/^proj_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(projectId, 'proj')).toBe(true);
		});

		it('generates valid application IDs', () => {
			const appId = FastBuildIdGenerator.generateAppId();

			expect(appId).toMatch(/^app_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(appId, 'app')).toBe(true);
		});

		it('generates valid table IDs', () => {
			const tableId = FastBuildIdGenerator.generateTableId();

			expect(tableId).toMatch(/^tbl_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(tableId, 'tbl')).toBe(true);
		});

		it('generates valid view IDs', () => {
			const viewId = FastBuildIdGenerator.generateViewId();

			expect(viewId).toMatch(/^view_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(viewId, 'view')).toBe(true);
		});

		it('generates valid column IDs', () => {
			const columnId = FastBuildIdGenerator.generateColumnId();

			expect(columnId).toMatch(/^col_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(columnId, 'col')).toBe(true);
		});

		it('generates valid member IDs', () => {
			const memberId = FastBuildIdGenerator.generateMemberId();

			expect(memberId).toMatch(/^mem_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(memberId, 'mem')).toBe(true);
		});

		it('generates valid page IDs', () => {
			const pageId = FastBuildIdGenerator.generatePageId();

			expect(pageId).toMatch(/^page_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(pageId, 'page')).toBe(true);
		});

		it('generates valid deployment IDs', () => {
			const deploymentId = FastBuildIdGenerator.generateDeploymentId();

			expect(deploymentId).toMatch(/^dep_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(deploymentId, 'dep')).toBe(true);
		});

		it('generates valid audit log IDs', () => {
			const auditLogId = FastBuildIdGenerator.generateAuditLogId();

			expect(auditLogId).toMatch(/^log_[\w-]{8}$/);
			expect(FastBuildIdGenerator.validateShortIdFormat(auditLogId, 'log')).toBe(true);
		});
	});

	describe('validateShortIdFormat', () => {
		it('validates correct format with expected prefix', () => {
			const validId = 'user_2W4bwcAo';
			expect(FastBuildIdGenerator.validateShortIdFormat(validId, 'user')).toBe(true);
		});

		it('rejects wrong prefix', () => {
			const wrongPrefixId = 'proj_2W4bwcAo';
			expect(FastBuildIdGenerator.validateShortIdFormat(wrongPrefixId, 'user')).toBe(false);
		});

		it('validates correct format without expected prefix', () => {
			const validId = 'proj_2W4bwcAo';
			expect(FastBuildIdGenerator.validateShortIdFormat(validId)).toBe(true);
		});

		it('rejects invalid formats', () => {
			const invalidIds = [
				'invalid-format',
				'user_',
				'user_abc',
				'user_toolong123456',
				'',
				null,
				undefined,
				123,
			];

			invalidIds.forEach(id => {
				expect(FastBuildIdGenerator.validateShortIdFormat(id as any)).toBe(false);
			});
		});

		it('handles edge cases', () => {
			const validEdgeCases = [
				'user_--------',
				'proj_XXXXXXXX',
				'app_12345678',
				'tbl_abcdefgh',
			];

			validEdgeCases.forEach(id => {
				expect(FastBuildIdGenerator.validateShortIdFormat(id)).toBe(true);
			});
		});
	});

	describe('extractPrefix', () => {
		it('extracts correct prefix', () => {
			const id = 'user_2W4bwcAo';
			expect(FastBuildIdGenerator.extractPrefix(id)).toBe('user');
		});

		it('returns null for invalid ID', () => {
			const invalidId = 'invalid-format';
			expect(FastBuildIdGenerator.extractPrefix(invalidId)).toBeNull();
		});

		it('returns null for null/undefined', () => {
			expect(FastBuildIdGenerator.extractPrefix(null as any)).toBeNull();
			expect(FastBuildIdGenerator.extractPrefix(undefined as any)).toBeNull();
		});
	});

	describe('extractRandomPart', () => {
		it('extracts correct random part', () => {
			const id = 'user_2W4bwcAo';
			expect(FastBuildIdGenerator.extractRandomPart(id)).toBe('2W4bwcAo');
		});

		it('returns null for invalid ID', () => {
			const invalidId = 'invalid-format';
			expect(FastBuildIdGenerator.extractRandomPart(invalidId)).toBeNull();
		});

		it('returns null for null/undefined', () => {
			expect(FastBuildIdGenerator.extractRandomPart(null as any)).toBeNull();
			expect(FastBuildIdGenerator.extractRandomPart(undefined as any)).toBeNull();
		});
	});

	describe('generateBatch', () => {
		it('generates batch of unique IDs', () => {
			const ids = FastBuildIdGenerator.generateBatch('test', 5);

			expect(ids).toHaveLength(5);
			ids.forEach(id => {
				expect(id).toMatch(/^test_[\w-]{8}$/);
			});

			// Check uniqueness
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(5);
		});

		it('validates count parameter', () => {
			expect(() => FastBuildIdGenerator.generateBatch('test', 0)).toThrow('between 1 and 1000');
			expect(() => FastBuildIdGenerator.generateBatch('test', -1)).toThrow('between 1 and 1000');
			expect(() => FastBuildIdGenerator.generateBatch('test', 1001)).toThrow('between 1 and 1000');
		});

		it('generates single ID', () => {
			const ids = FastBuildIdGenerator.generateBatch('test', 1);

			expect(ids).toHaveLength(1);
			expect(ids[0]).toMatch(/^test_[\w-]{8}$/);
		});
	});
});

describe('ID_GENERATORS', () => {
	it('contains all entity types', () => {
		const expectedPrefixes: ValidPrefix[] = [
			'user', 'proj', 'app', 'tbl', 'view', 'col', 'mem', 'page', 'dep', 'log'
		];

		expectedPrefixes.forEach(prefix => {
			expect(ID_GENERATORS[prefix]).toBeDefined();
			expect(typeof ID_GENERATORS[prefix]).toBe('function');
		});
	});

	it('generates valid IDs for all types', () => {
		Object.entries(ID_GENERATORS).forEach(([prefix, generator]) => {
			const id = generator();
			expect(id).toMatch(new RegExp(`^${prefix}_[\\w~-]{8}$`));
		});
	});
});

describe('generateIdForEntity', () => {
	it('generates ID for valid entity type', () => {
		const userId = generateIdForEntity('user');
		expect(userId).toMatch(/^user_[\w-]{8}$/);
	});

	it('throws error for invalid entity type', () => {
		expect(() => generateIdForEntity('invalid' as any)).toThrow('Unknown entity type: invalid');
	});

	it('works with all valid prefixes', () => {
		const validPrefixes: ValidPrefix[] = [
			'user', 'proj', 'app', 'tbl', 'view', 'col', 'mem', 'page', 'dep', 'log'
		];

		validPrefixes.forEach(prefix => {
			const id = generateIdForEntity(prefix);
			expect(id).toMatch(new RegExp(`^${prefix}_[\\w~-]{8}$`));
		});
	});
});