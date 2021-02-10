namespace dom2work {
    interface Init {
        kind: "init";
        atomic_sab: SharedArrayBuffer,
        stdin_sab:  SharedArrayBuffer,
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
