function main_worker() {
    self.onmessage = function(e: dom2work.Event) {
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
