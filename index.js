"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _reqUnsubs, _uuid, _database, _unmountNotMounted;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Requests = void 0;
const events_1 = require("events");
class Requests extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        _reqUnsubs.set(this, {});
        _uuid.set(this, null);
        _database.set(this, null);
        this.mount = (database = __classPrivateFieldGet(this, _database), uuid = __classPrivateFieldGet(this, _uuid)) => {
            __classPrivateFieldSet(this, _database, database);
            __classPrivateFieldSet(this, _uuid, uuid);
            const reqToKeysRef = database.ref(`/requests/to/${__classPrivateFieldGet(this, _uuid)}`);
            const reqFromKeysRef = database.ref(`/requests/from/${__classPrivateFieldGet(this, _uuid)}`);
            const onReqKeyAdded = (keySnap) => {
                const reqKey = keySnap.key;
                const reqRef = database.ref(`/requests/${reqKey}`);
                const settle = () => reqRef.update({ settled: true });
                const onReq = (reqSnap) => {
                    var _a, _b;
                    const reqVal = reqSnap.val();
                    if (reqVal) {
                        if (reqVal.settled) {
                            if (reqVal.from === __classPrivateFieldGet(this, _uuid)) {
                                reqFromKeysRef.child(reqKey).set(null);
                                reqRef.set(null);
                                this.emit(`settled`, reqSnap);
                                this.emit(`settled#${reqKey}`, reqSnap);
                            }
                            if (reqVal.to === __classPrivateFieldGet(this, _uuid)) {
                                reqToKeysRef.child(reqKey).set(null);
                            }
                        }
                        if (reqVal.from === __classPrivateFieldGet(this, _uuid)) {
                            this.emit(`request:from#${reqKey}`, reqSnap);
                            this.emit(`request:from`, reqSnap);
                        }
                        if (reqVal.to === __classPrivateFieldGet(this, _uuid)) {
                            this.emit(`request:to#${reqKey}`, reqSnap, settle);
                            this.emit(`request:to`, reqSnap, settle);
                            this.emit(`request#${reqKey}`, reqSnap, settle);
                            this.emit(`request`, reqSnap, settle);
                        }
                    }
                    else {
                        (_b = (_a = __classPrivateFieldGet(this, _reqUnsubs))[reqKey]) === null || _b === void 0 ? void 0 : _b.call(_a);
                        delete __classPrivateFieldGet(this, _reqUnsubs)[reqKey];
                    }
                };
                if (!__classPrivateFieldGet(this, _reqUnsubs)[reqKey]) {
                    __classPrivateFieldGet(this, _reqUnsubs)[reqKey] = () => reqRef.off('value', onReq);
                    reqRef.on('value', onReq);
                }
            };
            reqToKeysRef.on('child_added', onReqKeyAdded);
            reqFromKeysRef.on('child_added', onReqKeyAdded);
            this.unmount = () => {
                var _a, _b;
                reqToKeysRef.off('child_added', onReqKeyAdded);
                reqFromKeysRef.off('child_added', onReqKeyAdded);
                for (const reqKey in __classPrivateFieldGet(this, _reqUnsubs)) {
                    (_b = (_a = __classPrivateFieldGet(this, _reqUnsubs))[reqKey]) === null || _b === void 0 ? void 0 : _b.call(_a);
                    this.removeAllListeners('request:from:' + reqKey);
                    this.removeAllListeners('request:to:' + reqKey);
                    this.removeAllListeners('request:' + reqKey);
                    this.removeAllListeners('setteled:' + reqKey);
                }
                this.unmount = __classPrivateFieldGet(this, _unmountNotMounted);
            };
            return this.unmount;
        };
        this.send = (to, req, onValue) => __awaiter(this, void 0, void 0, function* () {
            if (!this.mounted)
                throw new Error('Can not send firebase request, Requests is not mounted');
            const from = __classPrivateFieldGet(this, _uuid);
            const reqRef = yield __classPrivateFieldGet(this, _database).ref(`/requests`)
                .push(Object.assign(Object.assign({}, req), { from, to }));
            const reqKey = reqRef.key;
            if (onValue)
                this.on(`request:from#${reqKey}`, onValue);
            yield __classPrivateFieldGet(this, _database).ref(`/requests/from/${from}/${reqKey}`).set(true);
            yield __classPrivateFieldGet(this, _database).ref(`/requests/to/${to}/${reqKey}`).set(true);
            if (onValue)
                return () => this.off(`request:from#${reqKey}`, onValue);
        });
        _unmountNotMounted.set(this, () => {
            throw new Error('Can not unmount Requests, not mounted');
        });
        this.unmount = __classPrivateFieldGet(this, _unmountNotMounted);
    }
    get mounted() {
        return this.unmount !== __classPrivateFieldGet(this, _unmountNotMounted);
    }
}
exports.Requests = Requests;
_reqUnsubs = new WeakMap(), _uuid = new WeakMap(), _database = new WeakMap(), _unmountNotMounted = new WeakMap();
