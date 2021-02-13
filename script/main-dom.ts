var main_dom_worker : Worker;
function main_dom() {
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
                        stdin_write(text);
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
                    case "Backspace":   stdin_write("\x08");    break;
                    case "Enter":       stdin_write("\n");      break;
                    case "NumpadEnter": stdin_write("\n");      break;
                    case "Tab":         stdin_write("\t");      break;
                    case "Esc":         stdin_write("\x1B");    break;
                    case "Escape":      stdin_write("\x1B");    break;
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
                        stdin_write(buffer);
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

    exec_base64_wasm("{BASE64_WASM32}");
}

function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) { throw `no such element in document: #${id}`; }
    return el;
}

const eCon      = requireElementById("console");
const eInput    = requireElementById("console-input");
const eCursor   = requireElementById("console-cursor");

function console_write(text: string) {
    if (text === "") return;
    eCon.insertBefore(document.createTextNode(text), eInput);
}

function console_write_proc_exit(code: number) {
    var exit = document.createElement("span");
    exit.textContent = `\nprocess exited with code ${code}`;
    exit.style.color = code == 0 ? "#888" : "#C44";
    eCon.insertBefore(exit, eInput);
    eCon.removeChild(eCursor);
}

var stdin_buf           : number[] = [];
var stdin_pending_io    : { max: number, callback: ((input: number[]) => void) }[] = [];

function stdin_read(max: number): Promise<number[]> {
    return new Promise((callback) => {
        stdin_pending_io.push({max, callback});
        stdin_dispatch();
    });
}

function stdin_write(text: string) {
    console_write(text);
    var bytes = new TextEncoder().encode(text);
    for (var i=0; i<bytes.length; ++i) {
        stdin_buf.push(bytes[i]);
    }
    stdin_dispatch();
}

function stdin_dispatch() {
    while (stdin_buf.length > 0 && stdin_pending_io.length > 0) {
        const io = stdin_pending_io.shift();
        if (io === undefined) continue;
        const nread = Math.min(stdin_buf.length, io.max);
        const read = stdin_buf.slice(0, nread);
        const after = stdin_buf.slice(nread);
        stdin_buf = after;
        (io.callback)(read);
    }
}
