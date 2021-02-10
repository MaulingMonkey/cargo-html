interface InitEventData {
    kind: "init";
    atomic_sab: SharedArrayBuffer,
    stdin_sab:  SharedArrayBuffer,
}

interface OtherEventData {
    kind: "_other";
}

type DomToWorkerData = InitEventData | OtherEventData;

interface WorkerMessageEvent extends MessageEvent {
    readonly data: DomToWorkerData;
}

function main_worker() {
    self.onmessage = function(e: WorkerMessageEvent) {
        switch (e.data.kind) {
            case "init":
                exec_base64_wasm(e.data, "{BASE64_WASM32}");
                break;
            default:
                console.error("unexpected event kind", e.data.kind);
                debugger;
                break;
        }
    };
}
