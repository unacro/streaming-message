import Server from "./packages/server/entry";

const server = Bun.serve(Server);

console.log(`Listening on ${server.url}`);
