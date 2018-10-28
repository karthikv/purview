export default class AsyncQueue<T> {
  private queue: T[] = []
  private pushed: Promise<void>
  private resolvePushed: () => void

  constructor() {
    this.setPushed()
  }

  push(elem: T): void {
    this.queue.push(elem)
    this.resolvePushed()
  }

  async next(): Promise<T> {
    if (this.queue.length > 0) {
      return this.queue.shift() as T
    } else {
      await this.pushed
      return this.next()
    }
  }

  setPushed(): void {
    this.pushed = new Promise(resolve => {
      this.resolvePushed = () => {
        resolve()
        this.setPushed()
      }
    })
  }
}
