// https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html

const ASYNCIFY_PAGE_COUNT : number = 1;

class Asyncifier {
    memory?:                MemoryLE;
    exports?:               Exports;
    rewinding:              boolean;
    unwinding:              boolean;
    rewind_result:          any;
    rewind_exception:       any;
    asyncify_byte_idx:      number;
    resolve:                undefined | (() => void) = undefined;
    reject:                 undefined | ((reject?: any) => void) = undefined;

    constructor() {
        this.memory                 = undefined;
        this.exports                = undefined;
        this.rewinding              = false;
        this.unwinding              = false;
        this.rewind_result          = undefined;
        this.rewind_exception       = undefined;
        this.asyncify_byte_idx      = 0;
    }

    launch(exports: Exports): Promise<void> {
        if (this.resolve || this.reject) throw "Asyncifier.launch already executing an entry point";

        if (this.exports) {
            if (this.exports.memory != exports.memory) throw "Asyncifier.launch cannot switch memory imports";
            // already allocated an asyncify page
        } else {
            const asyncify_page_idx = exports.memory.grow(ASYNCIFY_PAGE_COUNT);
            console.assert(asyncify_page_idx !== -1);
            this.asyncify_byte_idx = WASM_PAGE_SIZE * asyncify_page_idx;
        }

        this.memory     = new MemoryLE(exports.memory);
        this.exports    = exports;

        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject  = reject;
            this.restart_wasm();
        });
    }

    private restart_wasm() {
        const exports = this.exports;
        if (!exports) throw "Asyncifier.restart_wasm: never launched, no exports set";
        try {
            if      (exports.__cargo_html_start)    exports.__cargo_html_start();
            else if (exports._start)                exports._start();
            else if (exports.__wbindgen_start)      exports.__wbindgen_start();
            else                                    throw "WASM module has no entry point\nexpected one of __cargo_html_start, _start, or __wbindgen_start.";

            if (this.unwinding) {
                this.unwinding = false;
                this.exports!.asyncify_stop_unwind();
            } else {
                const r = this.resolve;
                this.resolve = undefined;
                this.reject = undefined;
                r!();
            }
        } catch (e) {
            const r = this.reject;
            this.resolve = undefined;
            this.reject = undefined;
            r!(e);
        }
    }

    asyncify<R>(f: () => PromiseLike<R>, waiting: R): R {
        if (this.exports === undefined) throw "Asyncifier.asyncify called before Asyncifier.launch";
        const exports = this.exports;
        if (!this.rewinding) {
            f().then(
                (result) => {
                    this.rewinding           = true;
                    this.rewind_result       = result;
                    this.rewind_exception    = undefined;
                    // shouldn't need to modify memory - should've been populated by code before asyncify_start_unwind
                    exports.asyncify_start_rewind(this.asyncify_byte_idx);
                    this.restart_wasm();
                },
                (error_reason) => {
                    this.rewinding           = true;
                    this.rewind_result       = undefined;
                    this.rewind_exception    = error_reason === undefined ? "undefined reason" : error_reason;
                    // shouldn't need to modify memory - should've been populated by code before asyncify_start_unwind
                    exports.asyncify_start_rewind(this.asyncify_byte_idx);
                    this.restart_wasm();
                },
            );

            this.unwinding = true;
            const ctx = new Uint32Array(this.memory!.memory.buffer, this.asyncify_byte_idx, 8);
            ctx[0] = this.asyncify_byte_idx + 8;
            ctx[1] = this.asyncify_byte_idx + (ASYNCIFY_PAGE_COUNT * WASM_PAGE_SIZE);
            exports.asyncify_start_unwind(this.asyncify_byte_idx);

            return waiting;
        } else { // this.rewinding
            this.rewinding = false;
            exports.asyncify_stop_rewind();
            if (this.rewind_exception !== undefined) {
                throw this.rewind_exception;
            } else {
                return this.rewind_result;
            }
        };
    }
}
