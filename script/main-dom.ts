var main_dom_worker : Worker;
function main_dom() {
    const con       = requireElementById("console");
    const cursor    = requireElementById("cursor");

    const atomic_sab    = new SharedArrayBuffer(4 * ATOMIC_COUNT);
    const atomic        = new Int32Array(atomic_sab);
    const stdin_sab     = new SharedArrayBuffer(STDIN_COUNT);
    const stdin         = new Uint8Array(stdin_sab);

    // spawn web worker
    const blob = new Blob(<BlobPart[]>Array.prototype.map.call(document.querySelectorAll('script:not([data-js-worker=\'false\'])'), function (oScript) { return oScript.textContent; }),{type: 'text/javascript'});
    main_dom_worker = new Worker(window.URL.createObjectURL(blob));
    main_dom_worker.onmessage = function(e: work2dom.Event) {
        switch (e.data.kind) {
            case "console":
                con.insertBefore(document.createTextNode(e.data.text), cursor);
                break;
            case "proc_exit":
                var exit = document.createElement("span");
                exit.textContent = `\nprocess exited with code ${e.data.code}`;
                exit.style.color = e.data.code == 0 ? "#888" : "#C44";
                con.insertBefore(exit, cursor);
                con.removeChild(cursor);
                break;
            default:
                console.error("unexpected event kind", e.data.kind);
                debugger;
                break;
        }
    };
    dom2work.post({
        kind: "init",
        atomic_sab,
        stdin_sab,
    });

    var stdin_buffer : number[] = [];
    document.addEventListener("keypress", function(e) {
        var text = e.char || String.fromCharCode(e.charCode);
        if (text === "\r") { text = "\n"; }
        var chars = new TextEncoder().encode(text);
        for (var i=0; i<chars.length; ++i) {
            stdin_buffer.push(chars[i]);
        }
    });

    setInterval(function(){
        if (stdin_buffer.length === 0) return;

        var filled      = Atomics.load(atomic, ATOMIC_STDIN_FILLED);
        var consumed    = Atomics.load(atomic, ATOMIC_STDIN_CONSUMED);
        var available   = STDIN_COUNT - ((filled-consumed)|0); // available *to write*

        var n = Math.min(available, stdin_buffer.length);
        for (var i=0; i<n; ++i) {
            stdin[(i+filled)&STDIN_MASK] = stdin_buffer[i];
        }
        stdin_buffer.splice(0, n);
        filled = (filled+n)|0;
        Atomics.store(atomic, ATOMIC_STDIN_FILLED, filled);
        Atomics.notify(atomic, ATOMIC_STDIN_FILLED, +Infinity);
    }, 0);
}

function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) { throw `no such element in document: #${id}`; }
    return el;
}
