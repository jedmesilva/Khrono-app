const http = require("http");
const net = require("net");

const METRO_PORT = 22861;
const PROXY_PORT = 5000;
const RETRY_INTERVAL = 500;
const MAX_RETRIES = 60;

function waitForMetro(retries = 0) {
  const sock = net.connect(METRO_PORT, "127.0.0.1");
  sock.on("connect", () => {
    sock.destroy();
    startProxy();
  });
  sock.on("error", () => {
    sock.destroy();
    if (retries < MAX_RETRIES) {
      setTimeout(() => waitForMetro(retries + 1), RETRY_INTERVAL);
    } else {
      console.error(`Expo proxy: Metro not available after ${MAX_RETRIES} retries. Starting anyway.`);
      startProxy();
    }
  });
}

function startProxy() {
  const proxy = http.createServer((req, res) => {
    const headers = { ...req.headers, host: `localhost:${METRO_PORT}` };
    if (headers.origin) headers.origin = `http://localhost:${METRO_PORT}`;
    if (headers.referer) headers.referer = `http://localhost:${METRO_PORT}/`;

    const options = {
      hostname: "localhost",
      port: METRO_PORT,
      path: req.url,
      method: req.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on("error", (err) => {
      if (!res.headersSent) {
        res.writeHead(502);
        res.end(`Proxy error: ${err.message}`);
      }
    });

    req.pipe(proxyReq, { end: true });
  });

  proxy.on("upgrade", (req, socket, head) => {
    const options = {
      hostname: "localhost",
      port: METRO_PORT,
      path: req.url,
      headers: req.headers,
    };

    const proxyReq = http.request(options);

    proxyReq.on("error", (err) => {
      console.warn(`Expo proxy: WebSocket upgrade error: ${err.message}`);
      socket.destroy();
    });

    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
          Object.entries(proxyRes.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n") +
          "\r\n\r\n"
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);

      proxySocket.on("error", () => socket.destroy());
      socket.on("error", () => proxySocket.destroy());
    });

    proxyReq.end();
  });

  proxy.listen(PROXY_PORT, "0.0.0.0", () => {
    console.log(`Expo proxy: port ${PROXY_PORT} → Metro on port ${METRO_PORT}`);
  });

  proxy.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.warn(`Expo proxy: port ${PROXY_PORT} is already in use; continuing with the existing proxy.`);
      process.exit(0);
    }

    console.error(`Expo proxy: ${err.message}`);
    process.exit(1);
  });
}

waitForMetro();
