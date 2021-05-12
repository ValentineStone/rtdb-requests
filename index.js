"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Requests = void 0;
const events_1 = require("events");
class Requests extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.#reqUnsubs = {};
        this.#uuid = null;
        this.#database = null;
        this.mount = (database = this.#database, uuid = this.#uuid) => {
            this.#database = database;
            this.#uuid = uuid;
            const reqToKeysRef = database.ref(`/requests/to/${this.#uuid}`);
            const reqFromKeysRef = database.ref(`/requests/from/${this.#uuid}`);
            const onReqKeyAdded = (keySnap) => {
                const reqKey = keySnap.key;
                const reqRef = database.ref(`/requests/${reqKey}`);
                const settle = () => reqRef.update({ settled: true });
                const onReq = (reqSnap) => {
                    const reqVal = reqSnap.val();
                    if (reqVal) {
                        if (reqVal.settled) {
                            if (reqVal.from === this.#uuid) {
                                reqFromKeysRef.child(reqKey).set(null);
                                reqRef.set(null);
                                this.emit(`settled`, reqSnap);
                                this.emit(`settled#${reqKey}`, reqSnap);
                            }
                            if (reqVal.to === this.#uuid) {
                                reqToKeysRef.child(reqKey).set(null);
                            }
                        }
                        if (reqVal.from === this.#uuid) {
                            this.emit(`request:from#${reqKey}`, reqSnap);
                            this.emit(`request:from`, reqSnap);
                        }
                        if (reqVal.to === this.#uuid) {
                            this.emit(`request:to#${reqKey}`, reqSnap, settle);
                            this.emit(`request:to`, reqSnap, settle);
                            this.emit(`request#${reqKey}`, reqSnap, settle);
                            this.emit(`request`, reqSnap, settle);
                        }
                    }
                    else {
                        this.#reqUnsubs[reqKey]?.();
                        delete this.#reqUnsubs[reqKey];
                    }
                };
                if (!this.#reqUnsubs[reqKey]) {
                    this.#reqUnsubs[reqKey] = () => reqRef.off('value', onReq);
                    reqRef.on('value', onReq);
                }
            };
            reqToKeysRef.on('child_added', onReqKeyAdded);
            reqFromKeysRef.on('child_added', onReqKeyAdded);
            this.unmount = () => {
                reqToKeysRef.off('child_added', onReqKeyAdded);
                reqFromKeysRef.off('child_added', onReqKeyAdded);
                for (const reqKey in this.#reqUnsubs) {
                    this.#reqUnsubs[reqKey]?.();
                    this.removeAllListeners('request:from:' + reqKey);
                    this.removeAllListeners('request:to:' + reqKey);
                    this.removeAllListeners('request:' + reqKey);
                    this.removeAllListeners('setteled:' + reqKey);
                }
                this.unmount = this.#unmountNotMounted;
            };
            return this.unmount;
        };
        this.send = async (to, req, onValue) => {
            if (!this.mounted)
                throw new Error('Can not send firebase request, Requests is not mounted');
            const from = this.#uuid;
            const reqRef = await this.#database.ref(`/requests`)
                .push({ from, to, ...req });
            const reqKey = reqRef.key;
            if (onValue)
                this.on(`request:from#${reqKey}`, onValue);
            await this.#database.ref(`/requests/from/${from}/${reqKey}`).set(true);
            await this.#database.ref(`/requests/to/${to}/${reqKey}`).set(true);
            if (onValue)
                return () => this.off(`request:from#${reqKey}`, onValue);
        };
        this.#unmountNotMounted = () => {
            throw new Error('Can not unmount Requests, not mounted');
        };
        this.unmount = this.#unmountNotMounted;
    }
    #reqUnsubs;
    #uuid;
    #database;
    #unmountNotMounted;
    get mounted() {
        return this.unmount === this.#unmountNotMounted;
    }
}
exports.Requests = Requests;
