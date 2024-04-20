class ServerSentEventsClient {
	static #instance = undefined;

	constructor(eventSourceUrl) {
		this.statusBadge = document.getElementById("badge-box");
		this.eventList = document.getElementById("message-box");
		this.eventSourceUrl = eventSourceUrl ?? "/events";
		this.eventSource = undefined;
	}

	static init(eventSourceUrl = undefined) {
		if (!ServerSentEventsClient.#instance) {
			ServerSentEventsClient.#instance = new ServerSentEventsClient(
				eventSourceUrl,
			);
		}
		return ServerSentEventsClient.#instance;
	}

	reconnect(eventSourceUrl = undefined) {
		this.stop();
		if (eventSourceUrl) {
			this.eventSourceUrl = eventSourceUrl;
		}
		this.start();
	}

	addMessage(dataPackage) {
		const msg = {
			time: new Date(dataPackage.time).toLocaleString(),
			speaker: dataPackage.speaker,
			data: JSON.stringify(dataPackage.data),
			meta: dataPackage.meta ?? null,
			status: dataPackage.status,
		};
		const newElement = document.createElement("tr");
		newElement.className = "odd:bg-gray-50";
		newElement.innerHTML = `<td class="whitespace-nowrap px-4 py-2 font-medium text-gray-900">${msg.time}</td>
<td class="whitespace-nowrap px-4 py-2 text-gray-700">${msg.speaker}</td>
<td class="whitespace-nowrap px-4 py-2 text-gray-700">${msg.data}</td>
<td class="whitespace-nowrap px-4 py-2 text-gray-700">${msg.meta}</td>
<td class="whitespace-nowrap px-4 py-2 text-gray-700">${msg.status}</td>`;
		if (this.eventList.childElementCount > 20) {
			this.eventList.removeChild(this.eventList.lastChild);
		}
		this.eventList.insertBefore(newElement, this.eventList.firstChild);
	}

	clearMessage() {
		this.eventList.innerHTML = "";
	}

	start() {
		if (this.eventSource) {
			return false;
		}
		console.log(`Try to connect "${this.eventSourceUrl}"...`);
		this.eventSource = new EventSource(this.eventSourceUrl); // { withCredentials: true }
		this.eventSource.onopen = (event) => {
			console.log("SSE open:", event);
			const newElement = document.createElement("span");
			newElement.className =
				"inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700";
			newElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
  stroke="currentColor" class="-ms-1 me-1.5 h-4 w-4">
  <path stroke-linecap="round" stroke-linejoin="round"
    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
<p class="whitespace-nowrap text-sm"> Live </p>
<button
  class="-me-1 ms-1.5 inline-block rounded-full bg-red-200 p-0.5 text-red-700 transition hover:bg-red-300"
  onClick="SSE.stop();return false;">
  <span class="sr-only">Remove badge</span>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
    stroke="currentColor" class="h-3 w-3">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>`;
			this.statusBadge.innerHTML = "";
			this.statusBadge.appendChild(newElement);
		};
		this.eventSource.onerror = (event) => {
			console.log("SSE error:", event);
			// console.log("Different code meaning:", Event.AT_TARGET === EventSource.CLOSED)
			// if (event.eventPhase == EventSource.CLOSED) this.eventSource.close()
			// Event.NONE (0)、Event.CAPTURING_PHASE (1)、Event.AT_TARGET (2) 和 Event.BUBBLING_PHASE (3)
			// EventSource.CONNECTING (0)、EventSource.OPEN (1)、EventSource.CLOSED (2)
			if (event.target.readyState === EventSource.CLOSED) {
				console.warn("Disconnected");
				this.stop();
			} else if (event.target.readyState === EventSource.CONNECTING) {
				console.log(`Connecting "${this.eventSourceUrl}"...`);
			}
		};
		this.eventSource.onmessage = (event) => {
			console.log("SSE message:", event);
			const data = JSON.parse(event.data);
			console.log(data);
			this.addMessage(data);
		};
	}

	stop() {
		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = undefined;
		}
		this.statusBadge.innerHTML = "";
	}
}

const eventSourceUrl = "/api/v1/events";
window.SSE = ServerSentEventsClient.init(eventSourceUrl);
