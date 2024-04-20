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
						.slice(-16)
						.toUpperCase(); // todo 是否应该放到 SessionManager 生成？
					_this.#sessions.addClient(
						"test_room", // todo 临时调试
						clientId,
						controller,
					);
					await _this._sendCustomEvent(controller, "meta", {
						api: {
							version: "0.5.0",
							updated_at: "2024-04-20 21:45:18",
						},
					});
					await _this._sendMessageEvent(controller, {
						speaker: "Server Notify",
						data: { message: `Welcome, ${clientId}!` },
						time: new Date().getTime(),
						meta: "connected",
						status: "✔ success",
					});
					while (!signal.aborted) {
						await _this._sendMessageEvent(controller, {
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
					await _this.#sessions.removeClient(clientId);
					controller.close();
				},
			}),
			{
				status: 201,
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
