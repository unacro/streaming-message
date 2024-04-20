import ServerSentEvents from "./server-sent-events";

const SSE = new ServerSentEvents();

function getResponse(statusCode: number, otherData: object = {}): Response {
	const statusCodeMessage: {
		[key: number]: string;
	} = {
		200: "OK",
		201: "Created",
		202: "Accepted",
		204: "No Content",
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		405: "Method Not Allowed",
		407: "Proxy Authentication Required",
		500: "Internal Server Error",
		501: "Not Implemented",
		502: "Bad Gateway",
	};
	if (statusCode in statusCodeMessage) {
		if (statusCode < 400) {
			return Response.json(
				{
					success: true,
					code: statusCode,
					msg: statusCodeMessage[statusCode],
					...otherData,
				},
				{ status: statusCode },
			);
		}
		return Response.json(
			{
				success: false,
				code: statusCode,
				msg: statusCodeMessage[statusCode],
				...otherData,
			},
			{ status: statusCode },
		);
	}
	return Response.json(
		{ success: false, code: -1, msg: "Unknown Error", ...otherData },
		{ status: 501 },
	);
}

const AvailableToken = [Bun.env.TEMP_AVAILABLE_TOKEN]; // todo 临时调试用

export default {
	async fetch(req) {
		const requestUrl = new URL(req.url);
		if (requestUrl.pathname === "/static/js/sse-client.js") {
			return new Response(Bun.file("packages/client/public/sse-client.js"));
		}
		const requestPaths = requestUrl.pathname.toLowerCase().split("/");
		if (requestPaths[1] === "api" && requestPaths[2] === "v1") {
			switch (requestPaths[3]) {
				case "dev":
					if (Bun.env.NODE_ENV === "production") {
						return getResponse(403);
					}
					switch (requestPaths[4]) {
						case "code":
							return new Response(Bun.file(import.meta.file));
						case "post":
							if (req.method === "POST") {
								const data = await req.json();
								console.log(`${requestUrl.pathname} Received JSON:`, data);
								return getResponse(202, { msg: "Post JSON success", data });
							}
							return getResponse(405);
						case "form":
							if (req.method === "POST") {
								const formData = await req.formData();
								const data = {
									username: formData.get("username"),
									password: formData.get("password"),
								};
								console.log(`${requestUrl.pathname} Received form:`, data);
								return getResponse(202, { msg: "Send form success", data });
							}
							return getResponse(405);
						default:
							break;
					}
					break;

				case "events":
					return SSE.newConnection(req);

				case "send": {
					const newMessageEvent = {};
					if (req.method === "GET") {
						const token = requestUrl.searchParams.get("token");
						if (!token || !AvailableToken.includes(token)) {
							return getResponse(401);
						}
						newMessageEvent.speaker = requestPaths[4]; // todo 考虑重新设计接口
						newMessageEvent.data = {
							message: requestUrl.searchParams.get("msg"),
							verified_by: "Request URL Parameters",
							from: "Web API",
							method: "GET",
						};
						newMessageEvent.meta = "message";
					} else {
						// PUT / PATCH / DELETE 等动词暂不考虑 一律视为 POST
						let AuthenticationPassed = false;
						let requestRawBody = undefined;
						let requestBody = undefined;
						try {
							/**
							 * @ignore 详细排查后发现 libcurl/8.4.0 (2023-10-11)
							 * 在 Windows 下 PowerShell 运行 curl
							 * -d 携带的请求体内 单引号中的双引号会被直接去掉
							 * 如 {"foo": "bar"} => {foo:bar}
							 */
							requestRawBody = await req.text();
							requestBody = JSON.parse(requestRawBody);
						} catch (error) {
							if (Bun.env.NODE_ENV !== "production") {
								console.warn(error);
								console.warn(`Request raw body:\n${requestRawBody}`);
							}
							return getResponse(400);
						}
						const authorizationHeader = req.headers.get("Authorization");
						if (
							authorizationHeader?.startsWith("Bearer ") &&
							AvailableToken.includes(authorizationHeader.slice(7))
						) {
							AuthenticationPassed = true; // 通过 Bearer token 验证
						} else if (
							requestBody?.token &&
							AvailableToken.includes(requestBody.token)
						) {
							AuthenticationPassed = true; // 通过请求体中的 token 验证
						}
						if (!AuthenticationPassed) {
							return getResponse(401);
						}
						newMessageEvent.speaker = requestBody?.speaker;
						newMessageEvent.data = {
							...requestBody?.data,
							from: "Web API",
							method: "POST",
						};
						newMessageEvent.meta = requestBody?.meta;
					}
					const tempDebugRoomId = "test_room";
					// todo 鉴权 控制器是否对目标播放器拥有控制权
					SSE.notify(tempDebugRoomId, newMessageEvent);
					return getResponse(202, {
						msg: "Message Event Sent",
						target: { room: tempDebugRoomId },
						event: newMessageEvent,
					});
				}

				default:
					break;
			}
		} else if (requestPaths[1] === "admin") {
			if (requestPaths[2]) {
				return getResponse(404);
			}
			// return getResponse(501, {
			// 	msg: "todo: 访问网页客户端(控制器)",
			// 	unnecessary_path: requestPaths[2],
			// });
			return new Response(
				Bun.file("packages/client/public/controller/index.html"),
			);
		} else {
			const roomId = requestPaths[1];
			if (roomId === "") {
				// return getResponse(501, { msg: "todo: 访问默认主页" });
			}
			// return getResponse(501, { msg: "todo: 访问网页客户端(播放器)", roomId });
			return new Response(Bun.file("packages/client/public/player/index.html"));
		}
		return getResponse(404); // 兜底响应
	},
};
