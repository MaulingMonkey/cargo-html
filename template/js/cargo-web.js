const global_fetch = fetch;
const WASMS = {};

function mount_wasm_base64(name, base64) {
    WASMS[name] = base64;
}

function launch_wasm(name) {
    function fetch(url, options) {
        const wasm = WASMS[url];
        if (wasm === undefined) return global_fetch(url, options);

        console.assert(url === name);
        var binary = atob(wasm);
        var typedarray = new Uint8Array(binary.length);
        for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }
        var body = new Blob([typedarray], { type: "application/wasm" });
        var response = new Response(body, { status: 200, statusText: "OK" });
        return Promise.resolve(response);
    }

    {PACKAGE_JS}
}
