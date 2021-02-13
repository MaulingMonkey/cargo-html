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
                        stdin.write(text);
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
                        con.input.textContent += text;
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
                    case "Backspace":   stdin.write("\x08");    break;
                    case "Enter":       stdin.write("\n");      break;
                    case "NumpadEnter": stdin.write("\n");      break;
                    case "Tab":         stdin.write("\t");      break;
                    case "Esc":         stdin.write("\x1B");    break;
                    case "Escape":      stdin.write("\x1B");    break;
                    default:            return; // process no further
                }
                break;
            case "linebuffered":
                switch (key) {
                    case "Backspace":
                        if (!!con.input.textContent) {
                            con.input.textContent = con.input.textContent.substr(0, con.input.textContent.length-1);
                        }
                        // else TODO: some kind of alert?
                        break;
                    case "Enter":
                    case "NumpadEnter":
                        var buffer = (con.input.textContent || "") + "\n";
                        con.input.textContent = "";
                        stdin.write(buffer);
                        break;
                    case "Tab":     con.input.textContent = (con.input.textContent || "") + "\t"; break;
                    case "Esc":     con.input.textContent = (con.input.textContent || "") + "\x1B"; break;
                    case "Escape":  con.input.textContent = (con.input.textContent || "") + "\x1B"; break;
                    default:        return; // process no further
                }
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    });

    exec_base64_wasm("{BASE64_WASM32}");
}
