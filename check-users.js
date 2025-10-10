import { db } from "./src/server/db.js";

async function checkUsers() {
	try {
		const users = await db.user.findMany();
		console.log("找到用户数量:", users.length);
		for (const user of users) {
			console.log("用户:", { id: user.id, email: user.email, name: user.name });
		}
	} catch (error) {
		console.error("查询用户失败:", error);
	} finally {
		process.exit(0);
	}
}

checkUsers();
