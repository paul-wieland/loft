// Injected into every package page before its own module runs.
// It exposes window.host to the page and relays calls to the app through postMessage.
// A card gets read-only store access and a way to open its tool; a tool gets full store access.
export type BridgeRole = 'tool' | 'card'

export function bridgeSource(role: BridgeRole): string {
  return `(() => {
  const role = ${JSON.stringify(role)};
  const pending = new Map();
  let nextId = 0;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message) return;
    if (message.type === 'workplace:theme') {
      document.documentElement.classList.toggle('dark', message.dark === true);
      return;
    }
    if (message.type !== 'workplace:result') return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.ok) entry.resolve(message.value);
    else entry.reject(new Error(message.error));
  });

  function call(op, args) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'workplace:call', id, op, args }, '*');
    });
  }

  const store = {
    list: (collection) => call('list', { collection }),
    get: (collection, id) => call('get', { collection, id }),
  };
  if (role === 'tool') {
    store.insert = (collection, data) => call('insert', { collection, data });
    store.update = (collection, id, data) => call('update', { collection, id, data });
    store.remove = (collection, id) => call('remove', { collection, id });
  }

  window.host = Object.freeze({
    card: role === 'card',
    store: Object.freeze(store),
    openTool: () => window.parent.postMessage({ type: 'workplace:open' }, '*'),
  });
  window.parent.postMessage({ type: 'workplace:ready' }, '*');
})();
`
}

export const HOST_BRIDGE_SOURCE = bridgeSource('tool')
export const CARD_BRIDGE_SOURCE = bridgeSource('card')
