var main_dom_worker : Worker;
function main_dom() {
    const eCon      = requireElementById("console");
    const eCursor   = requireElementById("cursor");

    const stdin = new io.SharedCircularBuffer(8192);

    // spawn web worker
    const blob = new Blob(<BlobPart[]>Array.prototype.map.call(document.querySelectorAll('script:not([data-js-worker=\'false\'])'), function (oScript) { return oScript.textContent; }),{type: 'text/javascript'});
    main_dom_worker = new Worker(window.URL.createObjectURL(blob));
    main_dom_worker.onmessage = function(e: work2dom.Event) {
        switch (e.data.kind) {
            case "console":
                eCon.insertBefore(document.createTextNode(e.data.text), eCursor);
                break;
            case "proc_exit":
                var exit = document.createElement("span");
                exit.textContent = `\nprocess exited with code ${e.data.code}`;
                exit.style.color = e.data.code == 0 ? "#888" : "#C44";
                eCon.insertBefore(exit, eCursor);
                eCon.removeChild(eCursor);
                break;
            default:
                console.error("unexpected event kind", e.data.kind);
                debugger;
                break;
        }
    };
    dom2work.post({
        kind: "init",
        stdin: stdin.sab,
    });

    document.addEventListener("keypress", function(e) {
        var text = e.char || String.fromCharCode(e.charCode);
        if (text === "\r") { text = "\n"; }
        stdin.write_all(text);
    });
}

function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) { throw `no such element in document: #${id}`; }
    return el;
}
