namespace con {
    function requireElementById(id: string): HTMLElement {
        let el = document.getElementById(id);
        if (!el) { throw `no such element in document: #${id}`; }
        return el;
    }

    const eCon      = requireElementById("console");
    const eInput    = requireElementById("console-input");
    const eCursor   = requireElementById("console-cursor");

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
}
