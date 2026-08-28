/**
 * Tradis Core: Bounded Memory Ring Buffer (Cordis Theorem 3: O(1) Memory Bound)
 * Guarantees zero memory leaks over years of streaming commodity tick/bar feeds.
 */
export class RingBuffer {
  constructor(capacity = 500) {
    if (capacity <= 0) throw new Error("Capacity must be positive");
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.count = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray() {
    const arr = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      arr.push(this.buffer[idx]);
    }
    return arr.reverse();
  }

  latest() {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  clear() {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
  }
}