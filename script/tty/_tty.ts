/**
 * Controls what HTML element(s) `"tty"` inputs/outputs bind to, as well as the behavior of those elements.
 */
interface TtySettings {
    /** The HTML element to attach keyboard listeners to. */        listen:     HTMLElement | string | Document | undefined;
    /** The HTML element to commit output to. */                    output:     HTMLElement | string;
    /** The HTML element to preview line-buffered input in. */      input:      HTMLElement | string;
    /** If input should be processed immediately or buffered. */    mode?:      InputMode;
    /** Output escape processing. */                                escape?:    OutputEscape;
}

/**
 * Controls how escape codes are interpreted by WASI.
 *
 * | value              | behavior |
 * | ------------------ | -------- |
 * | undefined          | `"line-buffered"`
 * | `"raw"`            | Input becomes available to stdin immediately as it's typed.
 * | `"line-buffered"`  | Input becomes available to stdin once enter is pressed.  Before then, backspace erases part of the input buffer.
 */
type InputMode = "raw" | "line-buffered";

/**
 * Controls how escape codes are interpreted by WASI.
 *
 * | value              | behavior |
 * | ------------------ | -------- |
 * | undefined          | `"ansi"`
 * | `"none"`           | What's an escape code?
 * | `"ansi"`           | Vaguely [ANSI](https://en.wikipedia.org/wiki/ANSI_escape_code)ish
 */
type OutputEscape = "none" | "ansi";
