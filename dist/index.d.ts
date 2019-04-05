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
export declare class RateLimitPromisePool {
    private concurrentLimit;
    private minWaitMs;
    private pool;
    private executionPool;
    private completedPool;
    private poolEmptyCallback;
    private executing;
    private lastCallTimestamp;
    private intervalRef;
    constructor(concurrentLimit: number, minWaitMs: number, poolEmptyCallback: Function);
    addItem(data: any, executionCallback: (data: any) => Promise<any>): void;
    startExecution(): void;
    stopExecution(): void;
    private execute(item);
}
