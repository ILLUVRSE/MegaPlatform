export class MatchmakingQueue {
  private queue: string[] = [];

  enqueue(clientId: string): boolean {
    if (this.queue.includes(clientId)) {
      return false;
    }
    this.queue.push(clientId);
    return true;
  }

  dequeue(clientId: string): void {
    this.queue = this.queue.filter((id) => id !== clientId);
  }

  popPair(): [string, string] | null {
    if (this.queue.length < 2) {
      return null;
    }
    const a = this.queue.shift();
    const b = this.queue.shift();
    if (!a || !b) {
      return null;
    }
    return [a, b];
  }

  remove(clientId: string): void {
    this.dequeue(clientId);
  }
}
