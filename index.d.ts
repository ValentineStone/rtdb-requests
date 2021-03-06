/// <reference types="node" />
import { EventEmitter } from 'events';
import type firebase from 'firebase';
import type firebaseAdm from 'firebase-admin';
declare type DataSnapshot = firebase.database.DataSnapshot | firebaseAdm.database.DataSnapshot;
declare type Database = firebase.database.Database | firebaseAdm.database.Database;
export interface Requests {
    on(event: string, listener: (reqSnap: DataSnapshot) => any): this;
}
export declare class Requests extends EventEmitter {
    #private;
    mount: (database?: Database, uuid?: string) => () => any;
    update: (reqKey: string, req: {
        [key: string]: any;
    }) => Promise<void>;
    send(to: string, req: {
        [key: string]: any;
    }): Promise<string>;
    send(to: string, req: {
        [key: string]: any;
    }, onValue?: (reqSnap: DataSnapshot) => any): Promise<() => any>;
    constructor();
    unmount: () => any;
    get mounted(): boolean;
}
export {};
