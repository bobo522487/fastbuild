import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * 获取当前已认证的用户
 * @returns 当前用户信息，如果未认证则返回null
 */
export async function getCurrentUser() {
	const session = await auth();
	if (!session?.user?.id) {
		return null;
	}

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			emailVerified: true,
		},
	});

	return user;
}
