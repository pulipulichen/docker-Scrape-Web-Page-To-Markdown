function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs one job at a time; after each job, waits postDelayMs (default 1s) before the next.
 */
function createSerialQueue(postDelayMs = 1000) {
  let running = false;
  const waiting = [];

  async function drain() {
    if (running || waiting.length === 0) return;
    running = true;
    const { run, resolve, reject } = waiting.shift();
    try {
      const out = await run();
      resolve(out);
    } catch (e) {
      reject(e);
    } finally {
      await sleep(postDelayMs);
      running = false;
      drain();
    }
  }

  return function enqueue(run) {
    return new Promise((resolve, reject) => {
      waiting.push({ run, resolve, reject });
      drain();
    });
  };
}

module.exports = { createSerialQueue, sleep };
