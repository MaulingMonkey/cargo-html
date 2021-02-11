namespace dom2work {
    export interface Init {
        kind:   "init";
        conio:  SharedArrayBuffer,
        stdin:  SharedArrayBuffer,
    }

    interface Other {
        kind: "_other";
    }

    type Data = Init | Other;

    export interface Event extends MessageEvent {
        readonly data: Data;
    }

    export function post(data: Data) {
        main_dom_worker.postMessage(data);
    }
}
