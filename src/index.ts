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

export interface RateLimitPromisePoolCheckpoint {
  callback: (data: any) => any;
  data: any;
  position: number;
}

export class RateLimitPromisePool {
  private concurrentLimit: number;
  private minWaitMs: number;
  private pool: RateLimitPromisePoolItem[] = [];
  private executionPool: RateLimitPromisePoolItem[] = [];
  private completedPool: RateLimitPromisePoolItem[] = [];
  private checkpointList: RateLimitPromisePoolCheckpoint[] = [];
  private promises: Promise<any>[] = [];
  private poolEmptyCallback: Function;
  private executing: boolean = false;
  private lastCallTimestamp: number = 0;
  private intervalRef: number = 0;

  /**
   * @description Number of promises that have resolved
   * @returns {number} The number of resolved promises
   */
  public get completed(): number {
    return this.completedPool.length;
  }

  /**
   * @description Number of promises that have not yet resolved
   * @returns {number} The number of unresolved promises
   */
  public get incomplete(): number {
    return this.pool.length + this.executionPool.length;
  }

  /**
   * @description Convenience getter to calculate the percentage of promises that are complete
   * @returns {number} The percentage of the pool that has been completed
   */
  public get percentComplete(): number {
    return this.completed / (this.completed + this.incomplete);
  }

  /**
   * @description Initialize a promise pool.
   * @param {number} concurrentLimit - Maximum number of items allowed to execute simultaneously.
   * @param {number} minWaitMs - Minimum time in milliseconds between executions.
   * @param {Function} poolEmptyCallback - A function called whenever the pool is empty. As new items can be added
   * while the pool is empty and still running, this can be called multiple times.
   */
  constructor(concurrentLimit: number, minWaitMs: number, poolEmptyCallback: Function) {
    this.concurrentLimit = concurrentLimit;
    this.minWaitMs = minWaitMs;
    this.poolEmptyCallback = poolEmptyCallback;
  }

  /**
   * @description Add an item to the pool to be executed.
   * @param data - This will be passed to the `executionCallback` when it is run
   * @param executionCallback - This should return a promise and will be run when its place comes up in the pool
   */
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

  /**
   * @description Add a checkpoint to the pool. A checkpoint will be executed only after every item added to the pool
   * before it was added has resolved its promise. This allows for ensuring that certain sections of the pool have
   * been completed.
   * 
   * @param data - This will be passed to the `callback` when it is executed.
   * @param callback - This will be called once all promises added to the pool prior to the checkpoint being added have
   * been resolved.
   */
  public addCheckpoint(data: any, callback: (data: any) => any) {
    this.checkpointList.push({
      callback,
      data,
      position: this.executionPool.length + this.completedPool.length + this.pool.length,
    });
  }

  /**
   * @description Begin execution of the items in the pool. This can be called before or after adding items; the pool
   * will continue execution until `stopExecution` is called even if it temporarily runs out of items.
   */
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

  /**
   * @description Stops further execution of the promise pool; no currently executing promises will be stopped, but no
   * further promises will be executed.
   */
  public stopExecution() {
    if (this.executing) {
      this.executing = false;
      clearInterval(this.intervalRef);
    }
  }

  private checkCheckpoints() {
    this.checkpointList.forEach((checkpoint, index) => {
      if (this.promises.length >= checkpoint.position) {
        Promise.all(this.promises.slice(0, checkpoint.position)).then(() => {
          checkpoint.callback(checkpoint.data);
        }).catch(() => {
          checkpoint.callback(checkpoint.data);
        });
        this.checkpointList.splice(index, 1);
      }
    });
  }

  private async execute(item: RateLimitPromisePoolItem) {
    try {
      const promise = item.execute(item.data);
      this.promises.push(promise);
      item.returnData = await promise;
    } catch (e) {
      item.returnData = e;
    }
    item.endTime = Date.now();

    const index = this.executionPool.indexOf(item);
    if (index !== -1) {
      this.completedPool.push(this.executionPool[index]);
      this.executionPool.splice(index, 1);
    }
    this.checkCheckpoints();
  }
}