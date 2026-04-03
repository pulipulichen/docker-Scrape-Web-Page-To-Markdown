function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 同一時間只執行一個任務；任務結束後固定等待 postDelayMs（預設 1 秒）再跑下一個。
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
