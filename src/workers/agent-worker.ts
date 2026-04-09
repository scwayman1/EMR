// Standalone agent worker. Long-running Node process that polls the
// AgentJob queue and executes claimed jobs.
//
// Run locally:   npm run worker
// Render:        configured as a background worker service in render.yaml

import { runTick } from "../lib/orchestration/runner";

const WORKER_ID = `worker-${process.pid}-${Date.now().toString(36)}`;
const POLL_INTERVAL_MS = process.env.NODE_ENV === "production" ? 10_000 : 2_000;
const BATCH_SIZE = 5;

let shuttingDown = false;

async function loop() {
  console.log(`[${WORKER_ID}] agent worker started, poll interval ${POLL_INTERVAL_MS}ms`);
  while (!shuttingDown) {
    try {
      const ran = await runTick(WORKER_ID, BATCH_SIZE);
      if (ran === 0) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error(`[${WORKER_ID}] tick error`, err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
  console.log(`[${WORKER_ID}] shutdown complete`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGINT", () => {
  console.log(`[${WORKER_ID}] SIGINT received, draining...`);
  shuttingDown = true;
});
process.on("SIGTERM", () => {
  console.log(`[${WORKER_ID}] SIGTERM received, draining...`);
  shuttingDown = true;
});

loop().catch((err) => {
  console.error("fatal worker error", err);
  process.exit(1);
});
