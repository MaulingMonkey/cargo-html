/**
 * Settings controlling WASI behavior.
 */
interface Settings {
    // Browser Environment
    tty?:           TtySettings;
    trap?:          "fatal" | "soft-debugger" | "debugger" | "fatal-debugger";

    // WASI Environment
    args?:          string[];
    env?:           { [key: string]: string };
    filesystem?:    { [path: string]: unknown };

    // I/O settings

    /** Controls how WASI reads from stdin (FD 0) */    stdin?:             Input;
    /** Controls how WASI writes to stdout (FD 1) */    stdout?:            Output;
    /** Controls how WASI writes to stderr (FD 2) */    stderr?:            Output;
    /** Controls how WASI writes exit(0) notices */     trace_exit_0?:      Output; // default behavior: per stdout
    /** Controls how WASI writes exit(n) notices */     trace_exit_n?:      Output; // default behavior: per stderr
    /** Controls how WASI writes signal notices */      trace_signal?:      Output; // default behavior: per stderr
    /** Controls how WASI writes I/O error notices */   trace_io_error?:    Output; // default behavior: "console-error" (debug) or "null" (release)

    // determinism
    determinism?:       "nondeterministic" | "disabled";
    random?:            "nondeterministic" | "disabled" | "insecure-nondeterministic";
    sleep?:             "nondeterministic" | "disabled" | "skip" | "busy-wait";
    clock?:             "nondeterministic" | "disabled" | "zero";
}

/**
 * Controls how WASI reads from inputs like `stdin`.
 *
 * | value      | behavior  |
 * | ---------- | --------- |
 * | undefined  | per `"tty"` if available, otheriwse per `"badfd"`
 * | `"tty"`    | Attach keyboard listeners to `tty.listen` (requires `wasm_asyncified`)
 * | `"badfd"`  | No file descriptor is opened, resulting in `ERRNO_BADFD` errors if read.
 * | `"prompt"` | Use [`Window.prompt()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt) whenever stdin runs out of input.
 *
 * TODO: read from file option?
 */
type Input = "tty" | "badfd" | "prompt";

/**
 * Controls how WASI writes to outputs like `stdout` / `stderr`.
 *
 * | value              | behavior |
 * | ------------------ | -------- |
 * | `undefined`        | Per `"tty"` if available, otherwise per `"null"`
 * | `"tty"`            | Insert HTML before `tty.input`
 * | `"badfd"`          | No file descriptor is opened, resulting in `ERRNO_BADFD` errors if written.
 * | `"null"`           | Writes are ignored, as if written to `/dev/null`.
 * | `"console-log"`    | Use [`console.log(...)`](https://developer.mozilla.org/en-US/docs/Web/API/Console/log)
 * | `"console-error"`  | Use [`console.error(...)`](https://developer.mozilla.org/en-US/docs/Web/API/Console/error)
 */
type Output = "tty" | "badfd" | "null" | "console-log" | "console-error";
