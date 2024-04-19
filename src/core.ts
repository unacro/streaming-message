/**
 * @class SessionManager
 * @description 会话管理系统
 * @todo 独立实现会话管理 依赖注入给服务端调用
 */
class SessionManager {
	constructor() {
		throw new Error("Not implemented yet");
	}
}

class ServerSentEvents {
	#clientList: object[];

	constructor() {
		this.#clientList = [];
	}

	protected _getClientList(client: object) {
		return this.#clientList.map((client) => client.id).join(", ");
	}

	protected _addClient(client: object) {
		this.#clientList.push(client);
		console.log(
			`Client [${
				client.id
			}] connected (Current clients: [${this._getClientList()}])`,
		);
	}

	protected _removeClient(clientId: string) {
		this.#clientList = this.#clientList.filter(
			(client) => client.id !== clientId,
		);
		console.log(
			`Client [${clientId}] disconnected (Current clients: [${this.#clientList
				.map((client) => client.id)
				.join(", ")}])`,
		);
	}

	protected _sendCustomEvent(
		controller: ReadableStreamDirectController,
		eventName: string,
		dataPackage: object,
	) {
		return controller.write(
			`event: ${eventName}\ndata:${JSON.stringify(dataPackage)}\n\n`,
		);
	}

	protected _sendMessageEvent(
		controller: ReadableStreamDirectController,
		dataPackage: object,
	) {
		return controller.write(`data:${JSON.stringify(dataPackage)}\n\n`);
	}

	notify(event: object) {
		console.log("Send notification:", event);
		this._sendMessageEvent(client.controller, {
			speaker: "Server Notify",
			data: event?.data,
			time: new Date().getTime(),
			meta: event?.meta,
			status: "✔ success",
		});
	}

	broadcast(event: object) {
		console.log("\nSend broadcast message:", event);
		this.#clientList.map((client) => {
			console.log("Broadcast send to client:", client.id);
			this._sendMessageEvent(client.controller, {
				speaker: event?.speaker,
				data: event?.data,
				time: new Date().getTime(),
				meta: event?.meta,
				status: "✔ success",
			});
		});
	}

	sendTo(clientId: string, event: object) {
		console.log(`Send private message to client [${clientId}]:`, event);
		this.#clientList
			.filter((client) => client.id === clientId)
			.map((client) => {
				this._sendMessageEvent(client.controller, {
					speaker: event?.speaker,
					data: event?.data,
					time: new Date().getTime(),
					meta: event?.meta,
					status: "✔ success",
				});
			});
	}

	getResponse(req: Request): Response {
		const sseServer: ServerSentEventsServer = this;
		const signal = req.signal;
		return new Response(
			new ReadableStream({
				type: "direct",
				async pull(controller: ReadableStreamDirectController) {
					const connectTime = new Date().getTime();
					const clientId = Bun.hash(connectTime)
						.toString(16)
						.slice(-16)
						.toUpperCase();
					sseServer._addClient({
						id: clientId,
						controller,
						connectTime,
					});
					await sseServer._sendCustomEvent(controller, "meta", {
						api: {
							version: "0.3.0",
							updated: "2024-04-20 00:02:32",
						},
					});
					await sseServer._sendMessageEvent(controller, {
						speaker: "Server Notify",
						data: { message: `Welcome, ${clientId}!` },
						time: new Date().getTime(),
						meta: "connected",
						status: "✔ success",
					});
					while (!signal.aborted) {
						await sseServer._sendMessageEvent(controller, {
							speaker: "Server Notify",
							data: {
								message: `Hello, ${clientId}!`,
								mock: btoa(
									Array.from({ length: 18 }, () =>
										String.fromCharCode(Math.floor(Math.random() * 94) + 33),
									).join(""),
								),
							},
							time: new Date().getTime(),
							meta: "heartbeat",
							status: "✔ success",
						});
						await controller.flush();
						await Bun.sleep(5000);
					}
					await sseServer._removeClient(clientId);
					controller.close();
				},
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					...(req.httpVersionMajor === 1 && { Connection: "keep-alive" }),
					"Access-Control-Allow-Origin": "*", // CORS
				},
			},
		);
	}
}

export default ServerSentEvents;
