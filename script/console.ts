namespace con {
    function requireElementById(id: string): HTMLElement {
        let el = document.getElementById(id);
        if (!el) { throw `no such element in document: #${id}`; }
        return el;
    }

    const eCon      = requireElementById("cargo-html-console");
    const eInput    = requireElementById("cargo-html-console-input");
    const eCursor   = requireElementById("cargo-html-console-cursor");

    export const input = eInput;

    export function write(text: string) {
        if (text === "") return;
        eCon.insertBefore(document.createTextNode(text), eInput);
    }

    export function write_proc_exit(code: number) {
        var exit = document.createElement("span");
        exit.textContent = `\nprocess exited with code ${code}`;
        exit.style.color = code == 0 ? "#888" : "#C44";
        eCon.insertBefore(exit, eInput);
        eCon.removeChild(eCursor);
    }

    export function write_proc_signal(desc: string, fatal: boolean) {
        var sig = document.createElement("span");
        sig.textContent = `\nprocess generated signal SIG${desc}`;
        sig.style.color = !fatal ? "#888" : "#C44";
        eCon.insertBefore(sig, eInput);
        if (fatal) {
            eCon.removeChild(eCursor);
        }
    }
}
