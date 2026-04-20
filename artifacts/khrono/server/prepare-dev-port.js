const { execFileSync } = require("child_process");

const requestedPort = Number(process.argv[2] || process.env.PORT || 5000);
const proxyPort = Number(process.env.EXPO_PROXY_PORT || 22861);

if (!Number.isInteger(requestedPort) || requestedPort <= 0) {
  console.error(`Invalid port: ${process.argv[2] || process.env.PORT}`);
  process.exit(1);
}

// Kill any existing Expo Metro processes on the requested port
const patterns = [
  `expo start --localhost --port ${requestedPort}`,
  `cli start --localhost --port ${requestedPort}`,
  `--port ${requestedPort}`,
];

for (const pattern of patterns) {
  try {
    execFileSync("pkill", ["-f", pattern], { stdio: "ignore" });
  } catch {
  }
}

// Kill any process holding the proxy port so the new proxy can bind cleanly
try {
  execFileSync("fuser", ["-k", `${proxyPort}/tcp`], { stdio: "ignore" });
} catch {
  // fuser may not be available or port may already be free
}

setTimeout(() => process.exit(0), 800);
