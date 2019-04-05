"use strict";
/**
 * A class to implement a rate-limited pool of jobs. A job will only be started if minWaitMs milliseconds have passed
 * AND if the currently executing pool count is less than concurrentLimit.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var RateLimitPromisePool = /** @class */ (function () {
    function RateLimitPromisePool(concurrentLimit, minWaitMs, poolEmptyCallback) {
        this.pool = [];
        this.executionPool = [];
        this.completedPool = [];
        this.executing = false;
        this.lastCallTimestamp = 0;
        this.intervalRef = 0;
        this.concurrentLimit = concurrentLimit;
        this.minWaitMs = minWaitMs;
        this.poolEmptyCallback = poolEmptyCallback;
    }
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
    RateLimitPromisePool.prototype.stopExecution = function () {
        if (this.executing) {
            this.executing = false;
            clearInterval(this.intervalRef);
        }
    };
    RateLimitPromisePool.prototype.execute = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, e_1, index;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = item;
                        return [4 /*yield*/, item.execute(item.data)];
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
                        return [2 /*return*/];
                }
            });
        });
    };
    return RateLimitPromisePool;
}());
exports.RateLimitPromisePool = RateLimitPromisePool;
//# sourceMappingURL=index.js.map