import ServerConfig from "./packages/server/entry";

const server = Bun.serve({
	hostname: Bun.env.HOST || "0.0.0.0",
	port: Bun.env.PORT || 8000,
	...ServerConfig,
});

console.log(`Listening on ${server.url}`);
