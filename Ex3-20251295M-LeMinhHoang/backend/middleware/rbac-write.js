// Serialize user/role membership writes inside the single Node instance used by
// the demo and Render Free. A multi-instance deployment needs a database lock.
let tail = Promise.resolve();

function serializeRbacWrite(...handlers) {
  return async (req, res) => {
    const previous = tail;
    let unlock;
    tail = new Promise((resolve) => { unlock = resolve; });
    await previous;
    try {
      if (res.destroyed) return;
      async function run(index) {
        const handler = handlers[index];
        if (handler) return handler(req, res, () => run(index + 1));
      }
      await run(0);
    } finally {
      // Retain the lock until the write settles, even if the client disconnects.
      unlock();
    }
  };
}

module.exports = { serializeRbacWrite };
