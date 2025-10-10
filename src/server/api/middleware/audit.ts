import { auth } from "~/server/auth";
import { db } from "~/server/db";

export interface AuditLogData {
	action: string;
	targetType: string;
	targetId?: string;
	message?: string;
	metadata?: unknown;
	projectId?: string;
}

export async function createAuditLog(data: AuditLogData) {
	const session = await auth();

	if (!session?.user) {
		console.warn("Audit log created without authenticated user");
		return;
	}

	try {
		await db.auditLog.create({
			data: {
				action: data.action,
				targetType: data.targetType,
				targetId: data.targetId,
				message: data.message,
				metadata: data.metadata as any,
				projectId: data.projectId,
				actorUserId: session.user.id,
			},
		});
	} catch (error) {
		console.error("Failed to create audit log:", error);
	}
}

// Export auditLogger for compatibility
export const auditLogger = {
	createAuditLog,
	log: createAuditLog,
};

export function withAudit<T extends unknown[], R>(
	action: string,
	targetType: string,
	fn: (...args: T) => Promise<R>,
	getTargetId?: (...args: T) => string,
	getProjectId?: (...args: T) => string,
) {
	return async (...args: T): Promise<R> => {
		const result = await fn(...args);

		await createAuditLog({
			action,
			targetType,
			targetId: getTargetId?.(...args),
			projectId: getProjectId?.(...args),
		});

		return result;
	};
}
