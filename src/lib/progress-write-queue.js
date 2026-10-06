export function createProgressWriteQueue({ delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const pending = new Map();
  return {
    get size() { return pending.size; },
    async drain(prefix) {
      await Promise.allSettled([...pending.entries()].filter(([key]) => key.startsWith(prefix)).map(([, write]) => write));
    },
    enqueue(key, save) {
      const previous = pending.get(key) || Promise.resolve();
      const write = previous.catch(() => {}).then(async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await save();
            return;
          } catch (error) {
            if (attempt === 2) throw error;
            await delay(1000 * (attempt + 1));
          }
        }
      });
      const tracked = write.finally(() => {
        if (pending.get(key) === tracked) pending.delete(key);
      });
      pending.set(key, tracked);
      return tracked;
    },
  };
}
