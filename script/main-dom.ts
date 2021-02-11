var main_dom_worker : Worker;
function main_dom() {
    const eCon      = requireElementById("console");
    const eInput    = requireElementById("console-input");
    const eCursor   = requireElementById("console-cursor");

    const stdin = (function(): io.SharedCircularBuffer | undefined {
        try {
            return new io.SharedCircularBuffer(8192);
        } catch (e) {
            // FF: No SharedArrayBuffer support?
            return undefined;
        }
    })();

    // spawn web worker
    const blob = new Blob(<BlobPart[]>Array.prototype.map.call(document.querySelectorAll('script:not([data-js-worker=\'false\'])'), function (oScript) { return oScript.textContent; }),{type: 'text/javascript'});
    main_dom_worker = new Worker(window.URL.createObjectURL(blob));
    main_dom_worker.onmessage = function(e: work2dom.Event) {
        switch (e.data.kind) {
            case "console":
                eCon.insertBefore(document.createTextNode(e.data.text), eInput);
                break;
            case "proc_exit":
                var exit = document.createElement("span");
                exit.textContent = `\nprocess exited with code ${e.data.code}`;
                exit.style.color = e.data.code == 0 ? "#888" : "#C44";
                eCon.insertBefore(exit, eInput);
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
        stdin: (stdin !== undefined) ? stdin.sab : undefined,
    });

    type Mode = "raw" | "linebuffered";
    const mode = function(): Mode { return "linebuffered"; }();
    document.addEventListener("keypress", function(e) {
        var text = e.char || String.fromCharCode(e.charCode);
        if (text === "\r") { text = "\n"; }
        switch (mode) {
            case "raw":
                switch (text) {
                    case "\n":
                    case "\r":
                    case "\t":
                        // should've already been handled by keydown event
                    default:
                        if (stdin !== undefined) {
                            stdin.write_all(text);
                        }
                        break;
                }
                break;
            case "linebuffered":
                switch (text) {
                    case "\n":
                    case "\r":
                    case "\t":
                        // should've already been handled by keydown event
                        break;
                    default:
                        eInput.textContent += text;
                        break;
                }
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener("keydown", function(e) {
        var key = "";
        if (e.ctrlKey   ) key += "Ctrl+";
        if (e.altKey    ) key += "Alt+";
        if (e.shiftKey  ) key += "Shift+";
        key += (e.key || e.code);

        switch (mode) {
            case "raw":
                switch (key) {
                    case "Backspace":   if (stdin !== undefined) { stdin.write_all("\x08"); } break;
                    case "Enter":       if (stdin !== undefined) { stdin.write_all("\n");   } break;
                    case "NumpadEnter": if (stdin !== undefined) { stdin.write_all("\n");   } break;
                    case "Tab":         if (stdin !== undefined) { stdin.write_all("\t");   } break;
                    case "Esc":         if (stdin !== undefined) { stdin.write_all("\x1B"); } break;
                    case "Escape":      if (stdin !== undefined) { stdin.write_all("\x1B"); } break;
                    default:            return; // process no further
                }
                break;
            case "linebuffered":
                switch (key) {
                    case "Backspace":
                        if (!!eInput.textContent) {
                            eInput.textContent = eInput.textContent.substr(0, eInput.textContent.length-1);
                        }
                        // else TODO: some kind of alert?
                        break;
                    case "Enter":
                    case "NumpadEnter":
                        var buffer = (eInput.textContent || "") + "\n";
                        eInput.textContent = "";
                        if (stdin !== undefined) {
                            stdin.write_all(buffer);
                        }
                        break;
                    case "Tab":     eInput.textContent = (eInput.textContent || "") + "\t"; break;
                    case "Esc":     eInput.textContent = (eInput.textContent || "") + "\x1B"; break;
                    case "Escape":  eInput.textContent = (eInput.textContent || "") + "\x1B"; break;
                    default:        return; // process no further
                }
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    });
}

function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) { throw `no such element in document: #${id}`; }
    return el;
}
