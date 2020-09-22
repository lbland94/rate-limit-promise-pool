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
export declare class RateLimitPromisePool {
    private concurrentLimit;
    private minWaitMs;
    private pool;
    private executionPool;
    private completedPool;
    private checkpointList;
    private promises;
    private poolEmptyCallback;
    private executing;
    private lastCallTimestamp;
    private intervalRef;
    /**
     * @description Number of promises that have resolved
     * @returns {number} The number of resolved promises
     */
    get completed(): number;
    /**
     * @description Number of promises that have not yet resolved
     * @returns {number} The number of unresolved promises
     */
    get incomplete(): number;
    /**
     * @description Convenience getter to calculate the percentage of promises that are complete
     * @returns {number} The percentage of the pool that has been completed
     */
    get percentComplete(): number;
    /**
     * @description Initialize a promise pool.
     * @param {number} concurrentLimit - Maximum number of items allowed to execute simultaneously.
     * @param {number} minWaitMs - Minimum time in milliseconds between executions.
     * @param {Function} poolEmptyCallback - A function called whenever the pool is empty. As new items can be added
     * while the pool is empty and still running, this can be called multiple times.
     */
    constructor(concurrentLimit: number, minWaitMs: number, poolEmptyCallback: Function);
    /**
     * @description Add an item to the pool to be executed.
     * @param data - This will be passed to the `executionCallback` when it is run
     * @param executionCallback - This should return a promise and will be run when its place comes up in the pool
     */
    addItem(data: any, executionCallback: (data: any) => Promise<any>): void;
    /**
     * @description Add a checkpoint to the pool. A checkpoint will be executed only after every item added to the pool
     * before it was added has resolved its promise. This allows for ensuring that certain sections of the pool have
     * been completed.
     *
     * @param data - This will be passed to the `callback` when it is executed.
     * @param callback - This will be called once all promises added to the pool prior to the checkpoint being added have
     * been resolved.
     */
    addCheckpoint(data: any, callback: (data: any) => any): void;
    /**
     * @description Begin execution of the items in the pool. This can be called before or after adding items; the pool
     * will continue execution until `stopExecution` is called even if it temporarily runs out of items.
     */
    startExecution(): void;
    /**
     * @description Stops further execution of the promise pool; no currently executing promises will be stopped, but no
     * further promises will be executed.
     */
    stopExecution(): void;
    private checkCheckpoints;
    private execute;
}
