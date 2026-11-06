// Injected into every package page before the tool's own module runs.
// It exposes window.host to the tool and relays calls to the app through postMessage.
export const HOST_BRIDGE_SOURCE = `(() => {
  const pending = new Map();
  let nextId = 0;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.type !== 'workplace:result') return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.ok) entry.resolve(message.value);
    else entry.reject(new Error(message.error));
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.type !== 'workplace:theme') return;
    document.documentElement.classList.toggle('dark', message.dark === true);
  });
  window.parent.postMessage({ type: 'workplace:ready' }, '*');

  function call(op, args) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'workplace:call', id, op, args }, '*');
    });
  }

  window.host = Object.freeze({
    store: Object.freeze({
      list: (collection) => call('list', { collection }),
      get: (collection, id) => call('get', { collection, id }),
      insert: (collection, data) => call('insert', { collection, data }),
      update: (collection, id, data) => call('update', { collection, id, data }),
      remove: (collection, id) => call('remove', { collection, id }),
    }),
  });
})();
`
