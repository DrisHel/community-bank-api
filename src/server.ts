import { app } from "./app.js";
import { checkDatabaseConnection } from "./database.js";

const PORT = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
	await checkDatabaseConnection();

	app.listen(PORT, () => {
		console.log(`Community Bank API running on port ${PORT}`);
	});
}

startServer().catch((error: unknown) => {
	console.error("Failed to start the API:", error);
	process.exit(1);
});
