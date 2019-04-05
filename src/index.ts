/**
 * A class to implement a rate-limited pool of jobs. A job will only be started if minWaitMs milliseconds have passed
 * AND if the currently executing pool count is less than concurrentLimit.
 */

export interface RateLimitPromisePoolItem {
  execute: (data: any) => Promise<any>;
  data: any;
  returnData: any;
  startTime: number;
  endTime: number;
}

export class RateLimitPromisePool {
  private concurrentLimit: number;
  private minWaitMs: number;
  private pool: RateLimitPromisePoolItem[] = [];
  private executionPool: RateLimitPromisePoolItem[] = [];
  private completedPool: RateLimitPromisePoolItem[] = [];
  private poolEmptyCallback: Function;
  private executing: boolean = false;
  private lastCallTimestamp: number = 0;
  private intervalRef: number = 0;

  constructor(concurrentLimit: number, minWaitMs: number, poolEmptyCallback: Function) {
    this.concurrentLimit = concurrentLimit;
    this.minWaitMs = minWaitMs;
    this.poolEmptyCallback = poolEmptyCallback;
  }

  public addItem(data: any, executionCallback: (data: any) => Promise<any>) {
    this.pool.unshift({
      data: data,
      returnData: {},
      execute: executionCallback,
      startTime: 0,
      endTime: 0,
    });
    if (this.executing && this.pool.length === 1 && this.executionPool.length === 0) {
      clearInterval(this.intervalRef);
      this.startExecution();
    }
  }

  public startExecution() {
    this.executing = true;

    this.intervalRef = setInterval(() => {
      if (this.pool.length > 0) {
        if (this.executionPool.length < this.concurrentLimit) {
          const now = Date.now();
          if (now - this.lastCallTimestamp > this.minWaitMs) {
            this.executionPool.unshift(this.pool.pop() || {} as RateLimitPromisePoolItem);
            this.lastCallTimestamp = Date.now();
            this.executionPool[0].startTime = this.lastCallTimestamp;
            this.execute(this.executionPool[0]);
          } else if (now > this.lastCallTimestamp) {
            setTimeout(() => {
              this.executionPool.unshift(this.pool.pop() || {} as RateLimitPromisePoolItem);
              this.lastCallTimestamp = Date.now();
              this.executionPool[0].startTime = this.lastCallTimestamp;
              this.execute(this.executionPool[0]);
            }, this.minWaitMs - (now - this.lastCallTimestamp));
            this.lastCallTimestamp += (Date.now() - now) + this.minWaitMs;
          }
        }
      } else if (this.executionPool.length === 0) {
        /**
         * Stop calling this interval if everything is empty; it will be restarted if still in execution mode and an
         * item is added.
         */
        clearInterval(this.intervalRef);
        this.poolEmptyCallback(this.completedPool);
      }
    }, Math.max(this.minWaitMs));
  }

  public stopExecution() {
    if (this.executing) {
      this.executing = false;
      clearInterval(this.intervalRef);
    }
  }

  private async execute(item: RateLimitPromisePoolItem) {
    try {
      item.returnData = await item.execute(item.data);
    } catch (e) {
      item.returnData = e;
    }
    item.endTime = Date.now();

    const index = this.executionPool.indexOf(item);
    if (index !== -1) {
      this.completedPool.push(this.executionPool[index]);
      this.executionPool.splice(index, 1);
    }
  }
}