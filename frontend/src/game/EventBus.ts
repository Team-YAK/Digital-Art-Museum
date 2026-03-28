type Listener = (...args: unknown[]) => void;

class SimpleEventEmitter {
  private events = new Map<string, Set<Listener>>();

  on(event: string, fn: Listener, context?: unknown): this {
    const bound = context ? fn.bind(context) : fn;
    (bound as { _original?: Listener })._original = fn;
    (bound as { _context?: unknown })._context = context;
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event)!.add(bound);
    return this;
  }

  off(event: string, fn?: Listener, context?: unknown): this {
    const listeners = this.events.get(event);
    if (!listeners) return this;
    if (!fn) { listeners.clear(); return this; }
    for (const bound of listeners) {
      const b = bound as { _original?: Listener; _context?: unknown };
      if (b._original === fn && b._context === context) {
        listeners.delete(bound);
        break;
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): this {
    const listeners = this.events.get(event);
    if (listeners) {
      for (const fn of [...listeners]) fn(...args);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) this.events.delete(event);
    else this.events.clear();
    return this;
  }
}

export const EventBus = new SimpleEventEmitter();
