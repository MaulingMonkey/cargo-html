/**
 * Error codes returned by functions.
 * 
 * Not all of these error codes are returned by the functions provided by this API;
 * some are used in higher-level library layers,
 * and others are provided merely for alignment with POSIX.
 * 
 * ### See Also
 * 
 * * [Rust wasi crate definition](https://docs.rs/wasi/0.10.2+wasi-snapshot-preview1/src/wasi/lib_generated.rs.html#25)
 * * [WASI standard documentation](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant)
 */
type Errno = u16 & { _not_real: "errno"; }



/** No error occurred. System call completed successfully. */
const ERRNO_SUCCESS             = <Errno>0;

/** Argument list too long. */
const ERRNO_2BIG                = <Errno>1;

/** Permission denied. */
const ERRNO_ACCESS              = <Errno>2;

/** Address in use. */
const ERRNO_ADDRINUSE           = <Errno>3;

/** Adress not available. */
const ERRNO_ADDRNOTAVAIL        = <Errno>4;

/** Address family not supported. */
const ERRNO_AFNOSUPPORT         = <Errno>5;

/** Resource unavailable, or operation would block. */
const ERRNO_AGAIN               = <Errno>6;

/** Connection already in progress. */
const ERRNO_ALREADY             = <Errno>7;

/** Bad file descriptor. */
const ERRNO_BADF                = <Errno>8;

/** Bad message. */
const ERRNO_BADMSG              = <Errno>9;

/** Device or resource busy. */
const ERRNO_BUSY                = <Errno>10;

/** Operation canceled. */
const ERRNO_CANCELED            = <Errno>11;

/** No child processes. */
const ERRNO_CHILD               = <Errno>12;

/** Connection aborted. */
const ERRNO_CONNABORTED         = <Errno>13;

/** Connection refused. */
const ERRNO_CONNREFUSED         = <Errno>14;

/** Connection reset. */
const ERRNO_CONNRESET           = <Errno>15;

/** Resource deadlock would occur. */
const ERRNO_DEADLK              = <Errno>16;

/** Destination address required. */
const ERRNO_DESTADDRREQ         = <Errno>17;

/** Mathematics argument out of domain of function. */
const ERRNO_DOM                 = <Errno>18; // Domain, not Document Object Model

/** @hidden Reserved. */
const ERRNO_DQUOT               = <Errno>19;

/** File exists. */
const ERRNO_EXIST               = <Errno>20;

/** Bad address. */
const ERRNO_FAULT               = <Errno>21;

/** File too large. */
const ERRNO_FBIG                = <Errno>22;

/** Host is unreachable. */
const ERRNO_HOSTUNREACH         = <Errno>23;

/** Identifier removed. */
const ERRNO_IDRM                = <Errno>24;

/** Illegal byte sequence. */
const ERRNO_ILSEQ               = <Errno>25;

/** Operation in progress. */
const ERRNO_INPROGRESS          = <Errno>26;

/** Interrupted function. */
const ERRNO_INTR                = <Errno>27;

// TODO: verify numbers bellow this marker

/** Invalid argument. */
const ERRNO_INVAL               = <Errno>28;

/** I/O error. */
const ERRNO_IO                  = <Errno>29;

/** Socket is connected. */
const ERRNO_ISCONN              = <Errno>30;

/** Is a directory. */
const ERRNO_ISDIR               = <Errno>31;

/** Too many levels of symbolic links. */
const ERRNO_LOOP                = <Errno>32;

/** File descriptor value too large. */
const ERRNO_MFILE               = <Errno>33;

/** Too many links. */
const ERRNO_MLINK               = <Errno>34;

/** Message too large. */
const ERRNO_MSGSIZE             = <Errno>35;

/** @hidden Reserved. */
const ERRNO_MULTIHOP            = <Errno>36;

/** Filename too long. */
const ERRNO_NAMETOOLONG         = <Errno>37;

/** Network is down. */
const ERRNO_NETDOWN             = <Errno>38;

/** Connection aborted by network. */
const ERRNO_NETRESET            = <Errno>39;

/** Network unreachable. */
const ERRNO_NETUNREACH          = <Errno>40;

/** Too many files open in system. */
const ERRNO_NFILE               = <Errno>41;

/** No buffer space available. */
const ERRNO_NOBUFS              = <Errno>42;

/** No such device. */
const ERRNO_NODEV               = <Errno>43;

/** No such file or directory. */
const ERRNO_NOENT               = <Errno>44;

/** Executable file format error. */
const ERRNO_NOEXEC              = <Errno>45;

/** No locks available. */
const ERRNO_NOLCK               = <Errno>46;

/** @hidden Reserved. */
const ERRNO_NOLINK              = <Errno>47;

/** Not enough space. */
const ERRNO_NOMEM               = <Errno>48;

/** No message of the desired type. */
const ERRNO_NOMSG               = <Errno>49;

/** Protocol not available. */
const ERRNO_NOPROTOOPT          = <Errno>50;

/** No space left on device. */
const ERRNO_NOSPC               = <Errno>51;

/** Function not supported. */
const ERRNO_NOSYS               = <Errno>52;

/** The socket is not connected. */
const ERRNO_NOTCONN             = <Errno>53;

/** Not a directory or a symbolic link to a directory. */
const ERRNO_NOTDIR              = <Errno>54;

/** Directory not empty. */
const ERRNO_NOTEMPTY            = <Errno>55;

/** State not recoverable. */
const ERRNO_NOTRECOVERABLE      = <Errno>56;

/** Not a socket. */
const ERRNO_NOTSOCK             = <Errno>57;

/** Not supported, or operatin not supported on socket. */
const ERRNO_NOTSUP              = <Errno>58;

/** Inappropriate I/O control operation. */
const ERRNO_NOTTY               = <Errno>59;

/** No such device or address. */
const ERRNO_NXIO                = <Errno>60;

/** Value too large to be stored in data type. */
const ERRNO_OVERFLOW            = <Errno>61;

/** Previous owned died. */
const ERRNO_OWNERDEAD           = <Errno>62;

/** Operation not permitted. */
const ERRNO_PERM                = <Errno>63;

/** Broken pipe. */
const ERRNO_PIPE                = <Errno>64;

/** Protocol error. */
const ERRNO_PROTO               = <Errno>65;

/** Protocol not supported. */
const ERRNO_PROTONOSUPPORT      = <Errno>66;

/** Protocol wrong type for socket. */
const ERRNO_PROTOTYPE           = <Errno>67;

/** Result too large. */
const ERRNO_RANGE               = <Errno>68;

/** Read-only file system. */
const ERRNO_ROFS                = <Errno>69;

/** Invalid seek. */
const ERRNO_SPIPE               = <Errno>70;

/** No such process. */
const ERRNO_SRCH                = <Errno>71;

/** @hidden Reserved. */
const ERRNO_STALE               = <Errno>72;

/** Connection timed out. */
const ERRNO_TIMEDOUT            = <Errno>73;

/** Text file busy. */
const ERRNO_TXTBSY              = <Errno>74;

/** Cross-device link. */
const ERRNO_XDEV                = <Errno>75;

/** Extension: Capabilities insufficient. */
const ERRNO_NOTCAPABLE          = <Errno>76;

/** Extension: Execution has been paused through asyncification. */
const ERRNO_ASYNCIFY            = <Errno>9001;
