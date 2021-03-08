const WASMS = {};

function mount_wasm_base64(name, base64) {
    WASMS[name] = base64;
}

async function launch_wasm(name) {
    const _cargo_html_wasm = WASMS[name];
    if (_cargo_html_wasm === undefined) throw `launch_wasm(${JSON.stringify(name)}): no such wasm module`;

    {PACKAGE_JS}

    var binary = atob(_cargo_html_wasm);
    var typedarray = new Uint8Array(binary.length);
    for (var i=0; i<binary.length; ++i) { typedarray[i] = binary.charCodeAt(i); }
    var body = new Blob([typedarray], { type: "application/wasm" });
    var response = new Response(body, { status: 200, statusText: "OK" });
    await wasm_bindgen(response);
}
