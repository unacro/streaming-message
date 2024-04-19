import ServerSentEvents from "./core";

const SSE = new ServerSentEvents();
const AvailableToken = [Bun.env.TEMP_AVAILABLE_TOKEN];

const server = Bun.serve({
	port: Bun.env.PORT || 8000,
	hostname: Bun.env.HOST || "0.0.0.0",
	async fetch(req) {
		const requestUrl = new URL(req.url);

		switch (requestUrl.pathname) {
			case "/":
				return new Response(Bun.file("demo/receiver.html"));
			case "/admin":
				return new Response(Bun.file("demo/sender.html"));
			case "/events":
				return SSE.getResponse(req);
			// case "/code":
			// 	return new Response(Bun.file(import.meta.file));
			case "/post":
				if (req.method === "POST") {
					const data = await req.json();
					console.log("Received JSON:", data);
					return Response.json({ success: true, data });
				}
				return new Response("Method Not Allowed", { status: 405 });
			// case "/form":
			// 	if (req.method === "POST") {
			// 		const data = await req.formData();
			// 		console.log("Received form:", data.get("someField"));
			// 		return new Response("Send form success");
			// 	}
			// 	return new Response("Method not allowed", { status: 405 });

			default:
				if (requestUrl.pathname.startsWith("/api/send")) {
					let event: object = {};
					switch (req.method) {
						case "GET": {
							const token = requestUrl.searchParams.get("token");
							if (!token || !AvailableToken.includes(token)) {
								return new Response("Unauthorized", { status: 401 });
							}
							event = {
								speaker: requestUrl.pathname.slice(10),
								data: {
									message: requestUrl.searchParams.get("msg"),
									from: "GET API",
								},
								meta: "broadcast",
							};
							break;
						}
						case "POST": {
							let AuthenticationPassed = false;
							let requestBody = undefined;
							const authorization = req.headers.get("Authorization");
							try {
								// requestBody = await req.json();
								/**
								 * @todo 目前使用 curl 访问接口似乎会将 JSON 字符串自动去掉引号
								 * 如 {"foo": "bar"} => {foo:bar}
								 * 需要进一步调查
								 * - bun 1.1.4 (2024-04-17)
								 * - libcurl/8.4.0 (2023-10-11)
								 * 不知道谁的问题
								 *
								 * 更新: 使用 Mockoon 测试复现成功 确认是 curl 的问题
								 * 但原因仍然未知 明明之前调试都一切正常 又没有更新过 curl 版本
								 */
								const body = await req.text();
								console.log("Request body:", body);
								requestBody = JSON.parse(body);
							} catch (error) {
								console.error(error);
								return new Response("Bad Request", { status: 400 });
							}
							if (
								authorization?.startsWith("Bearer ") &&
								AvailableToken.includes(authorization.slice(7))
							) {
								AuthenticationPassed = true; // 通过 Bearer token 验证
							} else if (
								requestBody?.token &&
								AvailableToken.includes(requestBody.token)
							) {
								AuthenticationPassed = true; // 通过请求体中的 token 验证
							}
							if (!AuthenticationPassed) {
								return new Response("Unauthorized", { status: 401 });
							}
							event = {
								speaker: requestBody?.speaker,
								data: requestBody?.data,
								meta: requestBody?.meta,
							};
							break;
						}

						default:
							return new Response("Method Not Allowed", { status: 405 });
					}
					SSE.broadcast(event);
					return Response.json({
						success: true,
						msg: "Event sent",
						event,
					});
				}
				return new Response("Page not found", { status: 404 });
		}
	},
});

console.log(`Listening on ${server.url}`);
