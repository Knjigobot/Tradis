/**
 * Tradis Core: Spatial Coeffect Context Manifold (Cordis Theorem 1)
 * Decouples market observables, orders, positions, and accounts.
 */
export class ContextManifold {
  constructor() {
    this.registry = new Map();
    this.subscribers = new Map();
  }

  get(key) {
    return this.registry.get(key);
  }

  has(key) {
    return this.registry.has(key);
  }

  set(key, value) {
    this.registry.set(key, value);
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(cb => cb(value));
    }
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    return () => this.subscribers.get(key).delete(callback);
  }
}
