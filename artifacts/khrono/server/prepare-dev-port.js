const { execFileSync } = require("child_process");

const requestedPort = Number(process.argv[2] || process.env.PORT || 5000);

if (!Number.isInteger(requestedPort) || requestedPort <= 0) {
  console.error(`Invalid port: ${process.argv[2] || process.env.PORT}`);
  process.exit(1);
}

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

setTimeout(() => process.exit(0), 500);