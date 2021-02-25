class DomTty {
    public static new(settings: Settings): DomTty | undefined {
        if (settings.domtty === undefined) return undefined;
        return new DomTty(settings.domtty);
    }

    write(text: string, color_hint?: string) {
        if (text === "") return;
        if (color_hint !== undefined) {
            const span = document.createElement("span");
            span.textContent = text;
            span.style.color = color_hint;
            this.output.insertBefore(span, this.input);
        } else {
            this.output.insertBefore(document.createTextNode(text), this.input);
        }
    }

    shutdown() {
        this.output.querySelectorAll(".cursor").forEach(c => c.remove());
    }

    private escape  : OutputEscape;
    private mode    : InputMode;
    private output  : HTMLElement;
    private input   : HTMLElement;

    private constructor(settings: DomTtySettings) {
        this.escape = settings.escape   || "ansi";
        this.mode   = settings.mode     || "line-buffered";
        this.output = typeof settings.output === "string" ? requireElementById(settings.output) : settings.output;
        this.input  = typeof settings.input  === "string" ? requireElementById(settings.input ) : settings.input;
        // settings.listen
    }
}

function requireElementById(id: string): HTMLElement {
    let el = document.getElementById(id);
    if (!el) throw `no such element in document: #${id}`;
    return el;
}
