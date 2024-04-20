type Client = {
	id: string;
	roomid: string; // 多对一关系 相当于数据库里的外键 指向 Room.id
	create_at: number;
	status: "online" | "offline";
	connection: ReadableStreamDirectController;
};

type Room = {
	id: string;
	clients: string[]; // 一对多关系
	config?: object;
};

/**
 * @class SessionManager
 * @description 会话管理系统
 */
class SessionManager {
	#db: {
		rooms: Record<string, Room>;
		clients: Record<string, Client>;
	};

	constructor() {
		this.#db = {
			rooms: {},
			clients: {},
		}; // 可以视为数据库里的两张表
	}

	addClient(
		roomId: string,
		clientId: string,
		connection: ReadableStreamDirectController,
	): boolean {
		const newClient: Client = {
			id: clientId,
			roomId,
			create_at: new Date().getTime(),
			status: "online",
			connection,
		};
		// 不考虑重复添加 应该没这么容易给我遇见哈希碰撞……吧
		this.#db.clients[newClient.id] = newClient;
		if (roomId in this.#db.rooms) {
			this.#db.rooms[roomId].clients.push(newClient.id);
		} else {
			this.#db.rooms[roomId] = {
				id: roomId,
				clients: [newClient.id],
			};
		}
		console.log(
			`Client [${clientId}] join room [${roomId}] (Current clients: [${this.getClientNameListString()}])`,
		);
		return true;
	}

	removeClient(clientId: string): boolean {
		if (clientId in this.#db.clients) {
			delete this.#db.clients[clientId];
		}
		for (const roomId in this.#db.rooms) {
			if (this.#db.rooms[roomId].clients.includes(clientId)) {
				this.#db.rooms[roomId].clients = this.#db.rooms[roomId].clients.filter(
					(clientIdInRoom) => clientIdInRoom !== clientId,
				);
				break;
			}
		}
		console.log(
			`Client [${clientId}] disconnected (Current clients: [${this.getClientNameListString()}])`,
		);
		return true;
	}

	getRoom(roomId: string): Room | undefined {
		if (roomId in this.#db.rooms) {
			return this.#db.rooms[roomId];
		}
		return undefined;
	}

	getClientList(status = "online"): Client[] {
		return this.#db.clients;
	}

	getClientNameList(): Client[] {
		// return Object.values(this.#db.rooms)
		// 	.map((room) => room.clients)
		// 	.reduce((roomClients, allClients) => allClients.concat(roomClients), []);
		return Object.keys(this.#db.clients); // 简单粗暴空间换时间
	}

	getClientNameListString(): string {
		return this.getClientNameList().join(", ");
	}

	getClient(clientId: string): Client | undefined {
		if (clientId in this.#db.clients) {
			return this.#db.clients[clientId];
		}
		return undefined;
	}
}

export default SessionManager;
