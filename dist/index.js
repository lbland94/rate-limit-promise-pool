"use strict";
/**
 * A class to implement a rate-limited pool of jobs. A job will only be started if minWaitMs milliseconds have passed
 * AND if the currently executing pool count is less than concurrentLimit.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitPromisePool = void 0;
var RateLimitPromisePool = /** @class */ (function () {
    /**
     * @description Initialize a promise pool.
     * @param {number} concurrentLimit - Maximum number of items allowed to execute simultaneously.
     * @param {number} minWaitMs - Minimum time in milliseconds between executions.
     * @param {Function} poolEmptyCallback - A function called whenever the pool is empty. As new items can be added
     * while the pool is empty and still running, this can be called multiple times.
     */
    function RateLimitPromisePool(concurrentLimit, minWaitMs, poolEmptyCallback) {
        this.pool = [];
        this.executionPool = [];
        this.completedPool = [];
        this.checkpointList = [];
        this.promises = [];
        this.executing = false;
        this.lastCallTimestamp = 0;
        this.intervalRef = 0;
        this.concurrentLimit = concurrentLimit;
        this.minWaitMs = minWaitMs;
        this.poolEmptyCallback = poolEmptyCallback;
    }
    Object.defineProperty(RateLimitPromisePool.prototype, "completed", {
        /**
         * @description Number of promises that have resolved
         * @returns {number} The number of resolved promises
         */
        get: function () {
            return this.completedPool.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RateLimitPromisePool.prototype, "incomplete", {
        /**
         * @description Number of promises that have not yet resolved
         * @returns {number} The number of unresolved promises
         */
        get: function () {
            return this.pool.length + this.executionPool.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RateLimitPromisePool.prototype, "percentComplete", {
        /**
         * @description Convenience getter to calculate the percentage of promises that are complete
         * @returns {number} The percentage of the pool that has been completed
         */
        get: function () {
            return this.completed / (this.completed + this.incomplete);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @description Add an item to the pool to be executed.
     * @param data - This will be passed to the `executionCallback` when it is run
     * @param executionCallback - This should return a promise and will be run when its place comes up in the pool
     */
    RateLimitPromisePool.prototype.addItem = function (data, executionCallback) {
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
    };
    /**
     * @description Add a checkpoint to the pool. A checkpoint will be executed only after every item added to the pool
     * before it was added has resolved its promise. This allows for ensuring that certain sections of the pool have
     * been completed.
     *
     * @param data - This will be passed to the `callback` when it is executed.
     * @param callback - This will be called once all promises added to the pool prior to the checkpoint being added have
     * been resolved.
     */
    RateLimitPromisePool.prototype.addCheckpoint = function (data, callback) {
        this.checkpointList.push({
            callback: callback,
            data: data,
            position: this.executionPool.length + this.completedPool.length + this.pool.length,
        });
    };
    /**
     * @description Begin execution of the items in the pool. This can be called before or after adding items; the pool
     * will continue execution until `stopExecution` is called even if it temporarily runs out of items.
     */
    RateLimitPromisePool.prototype.startExecution = function () {
        var _this = this;
        this.executing = true;
        this.intervalRef = setInterval(function () {
            if (_this.pool.length > 0) {
                if (_this.executionPool.length < _this.concurrentLimit) {
                    var now = Date.now();
                    if (now - _this.lastCallTimestamp > _this.minWaitMs) {
                        _this.executionPool.unshift(_this.pool.pop() || {});
                        _this.lastCallTimestamp = Date.now();
                        _this.executionPool[0].startTime = _this.lastCallTimestamp;
                        _this.execute(_this.executionPool[0]);
                    }
                    else if (now > _this.lastCallTimestamp) {
                        setTimeout(function () {
                            _this.executionPool.unshift(_this.pool.pop() || {});
                            _this.lastCallTimestamp = Date.now();
                            _this.executionPool[0].startTime = _this.lastCallTimestamp;
                            _this.execute(_this.executionPool[0]);
                        }, _this.minWaitMs - (now - _this.lastCallTimestamp));
                        _this.lastCallTimestamp += (Date.now() - now) + _this.minWaitMs;
                    }
                }
            }
            else if (_this.executionPool.length === 0) {
                /**
                 * Stop calling this interval if everything is empty; it will be restarted if still in execution mode and an
                 * item is added.
                 */
                clearInterval(_this.intervalRef);
                _this.poolEmptyCallback(_this.completedPool);
            }
        }, Math.max(this.minWaitMs));
    };
    /**
     * @description Stops further execution of the promise pool; no currently executing promises will be stopped, but no
     * further promises will be executed.
     */
    RateLimitPromisePool.prototype.stopExecution = function () {
        if (this.executing) {
            this.executing = false;
            clearInterval(this.intervalRef);
        }
    };
    RateLimitPromisePool.prototype.checkCheckpoints = function () {
        var _this = this;
        this.checkpointList.forEach(function (checkpoint, index) {
            if (_this.promises.length >= checkpoint.position) {
                Promise.all(_this.promises.slice(0, checkpoint.position)).then(function () {
                    checkpoint.callback(checkpoint.data);
                }).catch(function () {
                    checkpoint.callback(checkpoint.data);
                });
                _this.checkpointList.splice(index, 1);
            }
        });
    };
    RateLimitPromisePool.prototype.execute = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, _a, e_1, index;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        promise = item.execute(item.data);
                        this.promises.push(promise);
                        _a = item;
                        return [4 /*yield*/, promise];
                    case 1:
                        _a.returnData = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _b.sent();
                        item.returnData = e_1;
                        return [3 /*break*/, 3];
                    case 3:
                        item.endTime = Date.now();
                        index = this.executionPool.indexOf(item);
                        if (index !== -1) {
                            this.completedPool.push(this.executionPool[index]);
                            this.executionPool.splice(index, 1);
                        }
                        this.checkCheckpoints();
                        return [2 /*return*/];
                }
            });
        });
    };
    return RateLimitPromisePool;
}());
exports.RateLimitPromisePool = RateLimitPromisePool;
//# sourceMappingURL=index.js.map