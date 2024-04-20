import SessionManager from "./session";

class ServerSentEvents {
	#sessions: SessionManager;

	constructor() {
		this.#sessions = new SessionManager();
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

	broadcast(messageEvent: object) {
		console.log("\nSend broadcast message:", messageEvent);
		this.#sessions.getClientList().map((client) => {
			console.log("Broadcast send to client:", client.id);
			this._sendMessageEvent(client.connection, {
				speaker: messageEvent?.speaker,
				data: messageEvent?.data,
				time: new Date().getTime(),
				meta: messageEvent?.meta,
				status: "✔ success",
			});
		});
	}

	notify(roomId: string, messageEvent: object) {
		console.log(`Send notify to room [${roomId}]:`, messageEvent);
		const room = this.#sessions.getRoom(roomId);
		if (room) {
			room.clients.map((clientId) => {
				const clientInRoom = this.#sessions.getClient(clientId);
				if (clientInRoom) {
					this._sendMessageEvent(clientInRoom.connection, {
						speaker: messageEvent?.speaker,
						data: messageEvent?.data,
						time: new Date().getTime(),
						meta: messageEvent?.meta,
						status: "✔ success",
					});
				}
			});
		}
	}

	sendPrivateMessage(clientId: string, messageEvent: object) {
		console.log(`Send private message to [${clientId}]:`, messageEvent);
		const clientInRoom = this.#sessions.getClient(clientId);
		if (clientInRoom) {
			this._sendMessageEvent(clientInRoom.connection, {
				speaker: messageEvent?.speaker,
				data: messageEvent?.data,
				time: new Date().getTime(),
				meta: messageEvent?.meta,
				status: "✔ success",
			});
		}
	}

	newConnection(req: Request): Response {
		const _this: ServerSentEvents = this;
		const signal = req.signal;
		return new Response(
			new ReadableStream({
				type: "direct",
				async pull(controller: ReadableStreamDirectController) {
					const clientId: string = Bun.hash(new Date().getTime())
						.toString(16)
						.slice(-8)
						.toUpperCase(); // todo 是否应该放到 SessionManager 生成？
					const tempDebugRoomId = "test_room"; // todo 临时调试
					_this.#sessions.addClient(tempDebugRoomId, clientId, controller);
					await _this._sendCustomEvent(controller, "meta", {
						api: {
							version: "0.5.1",
							updated_at: "2024-04-20 23:49:51",
						},
					});
					await _this._sendMessageEvent(controller, {
						speaker: "Server Notify",
						data: { message: `Welcome, ${clientId}!`, room: tempDebugRoomId },
						time: new Date().getTime(),
						meta: "connected",
						status: "✔ success",
					});
					while (!signal.aborted) {
						await _this._sendMessageEvent(controller, {
							speaker: "Server Notify",
							data: {
								message: `Hello, ${clientId}!`,
								room: tempDebugRoomId,
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
					await _this.#sessions.removeClient(clientId);
					controller.close();
				},
			}),
			{
				status: 200, // 按理说应该返回 "201 Created" 清晰准确地表达请求结果语义
				// 但某些弱智客户端实现不认 200 以外的 HTTP 状态码 (点名浏览器和 Hoppscotch)
				// 学学 curl
				// curl -vH Accept:text/event-stream "localhost:8000/api/v1/events"
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
