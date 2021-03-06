import { EventEmitter } from 'events'
import type firebase from 'firebase'
import type firebaseAdm from 'firebase-admin'

type DataSnapshot = firebase.database.DataSnapshot | firebaseAdm.database.DataSnapshot
type Database = firebase.database.Database | firebaseAdm.database.Database

export interface Requests {
  on(event: string, listener: (reqSnap: DataSnapshot) => any): this;
}

export class Requests extends EventEmitter {
  #reqUnsubs = {}
  #uuid: string = null
  #database: Database = null
  mount = (
    database = this.#database,
    uuid = this.#uuid
  ) => {
    this.#database = database
    this.#uuid = uuid
    const reqToKeysRef = database.ref(`/requests/to/${this.#uuid}`)
    const reqFromKeysRef = database.ref(`/requests/from/${this.#uuid}`)
    const onReqKeyAdded = (keySnap: DataSnapshot) => {
      const reqKey = keySnap.key
      const reqRef = database.ref(`/requests/${reqKey}`)
      const settle = () => reqRef.update({ settled: true })
      const onReq = (reqSnap: DataSnapshot) => {
        const reqVal = reqSnap.val()
        if (reqVal) {
          if (reqVal.settled) {
            if (reqVal.from === this.#uuid) {
              reqFromKeysRef.child(reqKey).set(null)
              reqRef.set(null)
              this.emit(`settled`, reqSnap)
              this.emit(`settled#${reqKey}`, reqSnap)
            }
            if (reqVal.to === this.#uuid) {
              reqToKeysRef.child(reqKey).set(null)
            }
          }

          if (reqVal.from === this.#uuid) {
            this.emit(`request:from#${reqKey}`, reqSnap)
            this.emit(`request:from`, reqSnap)
          }
          if (reqVal.to === this.#uuid) {
            this.emit(`request:to#${reqKey}`, reqSnap, settle)
            this.emit(`request:to`, reqSnap, settle)
            this.emit(`request#${reqKey}`, reqSnap, settle)
            this.emit(`request`, reqSnap, settle)
          }
          this.emit(reqKey, reqVal)
        }
        else {
          this.#reqUnsubs[reqKey]?.()
          delete this.#reqUnsubs[reqKey]
        }
      }
      if (!this.#reqUnsubs[reqKey]) {
        this.#reqUnsubs[reqKey] = () => reqRef.off('value', onReq)
        reqRef.on('value', onReq)
      }
    }
    reqToKeysRef.on('child_added', onReqKeyAdded)
    reqFromKeysRef.on('child_added', onReqKeyAdded)
    this.unmount = () => {
      reqToKeysRef.off('child_added', onReqKeyAdded)
      reqFromKeysRef.off('child_added', onReqKeyAdded)
      for (const reqKey in this.#reqUnsubs) {
        this.#reqUnsubs[reqKey]?.()
        this.removeAllListeners('request:from:' + reqKey)
        this.removeAllListeners('request:to:' + reqKey)
        this.removeAllListeners('request:' + reqKey)
        this.removeAllListeners('setteled:' + reqKey)
      }
      this.unmount = this.#unmountNotMounted
    }
    return this.unmount
  }
  update = async (reqKey: string, req: { [key: string]: any }) => {
    await this.#database.ref(`/requests/${reqKey}`).update(req)
  }
  send(to: string, req: { [key: string]: any }): Promise<string>;
  send(to: string, req: { [key: string]: any },
    onValue?: (reqSnap: DataSnapshot) => any): Promise<() => any>;
  async send(
    to: string,
    req: { [key: string]: any },
    onValue?: (reqSnap: DataSnapshot) => any
  ): Promise<string | (() => any)> {
    if (!this.mounted)
      throw new Error('Can not send firebase request, Requests is not mounted')
    const from = this.#uuid
    const reqRef = await this.#database.ref(`/requests`)
      .push({ ...req, from, to })
    const reqKey = reqRef.key
    if (onValue) this.on(`request:from#${reqKey}`, onValue)
    await this.#database.ref(`/requests/from/${from}/${reqKey}`).set(true)
    await this.#database.ref(`/requests/to/${to}/${reqKey}`).set(true)
    if (onValue)
      return () => this.off(`request:from#${reqKey}`, onValue)
    else
      return reqKey
  }
  constructor() {
    super()
    this.send = this.send.bind(this)
  }

  #unmountNotMounted = () => {
    throw new Error('Can not unmount Requests, not mounted')
  }
  unmount: () => any = this.#unmountNotMounted
  get mounted() {
    return this.unmount !== this.#unmountNotMounted
  }
}