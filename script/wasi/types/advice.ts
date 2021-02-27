/**
 * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#advice)\]
 * File or memory access pattern advisory information.
 */
type Advice = u8 & { _not_real: "advice" };



/** The application has no advice to give on its behavior with respect to the specified data. */
const ADVICE_NORMAL     = <Advice>0;

/** The application expects to access the specified data sequentially from lower offsets to higher offsets. */
const ADVICE_SEQUENTIAL = <Advice>1;

/** The application expects to access the specified data in a random order. */
const ADVICE_RANDOM     = <Advice>2;

/** The application expects to access the specified data in the near future. */
const ADVICE_WILLNEED   = <Advice>3;

/** The application expects that it will not access the specified data in the near future. */
const ADVICE_DONTNEED   = <Advice>4;

/** The application expects to access the specified data once and then not reuse it thereafter. */
const ADVICE_NOREUSE    = <Advice>5;
