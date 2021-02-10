namespace work2dom {
    interface Console {
        kind:   "console";
        text:   string;
    }

    interface ProcExit {
        kind:   "proc_exit";
        code:   number;
    }

    interface Other {
        kind:   "_other";
    }

    type Data = Console | ProcExit | Other;

    export interface Event extends MessageEvent {
        readonly data: Data;
    }

    export function post(message: Data) {
        // https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/postMessage not
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
        (self as any).postMessage(message);
    }
}
