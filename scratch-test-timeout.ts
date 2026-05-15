import { withTimeout } from "./src/lib/utils/with-timeout";

async function run() {
  console.log("Starting test");
  const hangingPromise = new Promise((resolve) => {
    // Never resolves
  });
  
  const result = await withTimeout(hangingPromise, 1000, "FALLBACK");
  console.log("Result:", result);
}

run();
