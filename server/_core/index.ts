import { createServer } from "http";
import { createApp } from "./app";

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
