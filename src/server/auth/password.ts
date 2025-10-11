import { hash, verify, argon2id } from "argon2";
import { createHash, randomBytes } from "crypto";

// Argon2id 配置 - 推荐的安全参数
const ARGON2_OPTIONS = {
	// 内存成本：推荐 64MB 或更高
	memoryCost: 65536, // 64 MB
	// 时间成本：推荐 3-4 次迭代
	timeCost: 3,
	// 并行度：通常设为 1 或 2
	parallelism: 1,
	// 输出哈希长度：32 字节 (256 位)
	hashLength: 32,
	// 使用 Argon2id（混合模式）
	type: argon2id,
};

export async function hashPassword(password: string): Promise<string> {
	return await hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
	hashedPassword: string,
	password: string,
): Promise<boolean> {
	// 注意：verify 函数的第一个参数是哈希值，第二个参数是原始密码
	// 不需要传递配置选项，因为配置已经编码在哈希中
	return await verify(hashedPassword, password);
}

// ===== PostgreSQL 18 pgcrypto 增强功能 =====

/**
 * SHA512 哈希函数（用于 API 密钥、敏感配置等）
 */
export function hashSHA512(data: string): string {
	return createHash('sha512').update(data).digest('hex');
}

/**
 * 生成安全的随机密钥
 */
export function generateSecureKey(length: number = 32): string {
	return randomBytes(length).toString('hex');
}

/**
 * PostgreSQL pgcrypto SHA512 哈希（推荐用于敏感数据）
 */
export async function hashWithPGCrypto(data: string, prisma: any): Promise<string> {
	try {
		const result = await prisma.$queryRaw`
			SELECT crypt(${data}, gen_salt('sha512')) as hash
		` as any[];
		return result[0]?.hash || '';
	} catch (error) {
		console.error('❌ PostgreSQL SHA512 哈希失败，使用 Node.js 备选方案:', error);
		// 降级到 Node.js SHA512
		return hashSHA512(data);
	}
}

/**
 * 验证 PostgreSQL pgcrypto 哈希
 */
export async function verifyPGCryptoHash(
	data: string,
	hashedData: string,
	prisma: any
): Promise<boolean> {
	try {
		const result = await prisma.$queryRaw`
			SELECT crypt(${data}, ${hashedData}) = ${hashedData} as is_valid
		` as any[];
		return result[0]?.is_valid || false;
	} catch (error) {
		console.error('❌ PostgreSQL 哈希验证失败:', error);
		return false;
	}
}

/**
 * 创建 API 密钥（使用 PostgreSQL 18 SHA512）
 */
export async function createAPIKey(
	description: string,
	userId: string,
	prisma: any
): Promise<{ key: string; hashedKey: string; keyId: string }> {
	const keyId = randomBytes(8).toString('hex');
	const rawKey = `fb_${keyId}_${generateSecureKey(24)}`;
	const hashedKey = await hashWithPGCrypto(rawKey, prisma);

	// 返回给用户的密钥只显示一次
	const displayKey = `fb_${keyId}_${rawKey.split('_')[2]}`;

	return {
		key: displayKey,
		hashedKey,
		keyId
	};
}

/**
 * 验证 API 密钥
 */
export async function verifyAPIKey(
	providedKey: string,
	storedHash: string,
	prisma: any
): Promise<boolean> {
	// 重构完整密钥
	const fullKey = `fb_${providedKey}`;
	return await verifyPGCryptoHash(fullKey, storedHash, prisma);
}

/**
 * 为敏感配置生成哈希（应用配置、部署密钥等）
 */
export async function hashSensitiveConfig(
	config: Record<string, any>,
	prisma: any
): Promise<string> {
	const configString = JSON.stringify(config, Object.keys(config).sort());
	return await hashWithPGCrypto(configString, prisma);
}

/**
 * 验证敏感配置哈希
 */
export async function verifySensitiveConfig(
	config: Record<string, any>,
	storedHash: string,
	prisma: any
): Promise<boolean> {
	const configString = JSON.stringify(config, Object.keys(config).sort());
	return await verifyPGCryptoHash(configString, storedHash, prisma);
}

/**
 * 数据完整性校验（使用 CRC32）
 */
export function calculateCRC32(data: string): number {
	// 简单的 CRC32 实现（PostgreSQL 18 有原生支持）
	const crcTable = Array(256).fill(0);

	// 生成 CRC32 表
	for (let i = 0; i < 256; i++) {
		let crc = i;
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
		}
		crcTable[i] = crc;
	}

	// 计算 CRC32
	let crc = 0 ^ 0xFFFFFFFF;
	for (let i = 0; i < data.length; i++) {
		crc = crcTable[(crc ^ data.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
	}

	return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * 为 JSON 数据生成完整性校验
 */
export function generateDataIntegrityHash(data: any): {
	data: any;
	crc32: number;
	sha512: string;
	timestamp: Date;
} {
	const dataString = JSON.stringify(data);
	const crc32 = calculateCRC32(dataString);
	const sha512 = hashSHA512(dataString);

	return {
		data,
		crc32,
		sha512,
		timestamp: new Date()
	};
}
