namespace wasi {
    /**
     * \[[WASI](https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#errno)\]
     * Error codes returned by functions.
     *
     * Not all of these error codes are returned by the functions provided by this API;
     * some are used in higher-level library layers,
     * and others are provided merely for alignment with POSIX.
     */
    export type Errno = u16 & { _not_real: "errno"; }



    /** No error occurred. System call completed successfully. */
    export const ERRNO_SUCCESS             = <Errno>0;

    /** Argument list too long. */
    export const ERRNO_2BIG                = <Errno>1;

    /** Permission denied. */
    export const ERRNO_ACCESS              = <Errno>2;

    /** Address in use. */
    export const ERRNO_ADDRINUSE           = <Errno>3;

    /** Adress not available. */
    export const ERRNO_ADDRNOTAVAIL        = <Errno>4;

    /** Address family not supported. */
    export const ERRNO_AFNOSUPPORT         = <Errno>5;

    /** Resource unavailable, or operation would block. */
    export const ERRNO_AGAIN               = <Errno>6;

    /** Connection already in progress. */
    export const ERRNO_ALREADY             = <Errno>7;

    /** Bad file descriptor. */
    export const ERRNO_BADF                = <Errno>8;

    /** Bad message. */
    export const ERRNO_BADMSG              = <Errno>9;

    /** Device or resource busy. */
    export const ERRNO_BUSY                = <Errno>10;

    /** Operation canceled. */
    export const ERRNO_CANCELED            = <Errno>11;

    /** No child processes. */
    export const ERRNO_CHILD               = <Errno>12;

    /** Connection aborted. */
    export const ERRNO_CONNABORTED         = <Errno>13;

    /** Connection refused. */
    export const ERRNO_CONNREFUSED         = <Errno>14;

    /** Connection reset. */
    export const ERRNO_CONNRESET           = <Errno>15;

    /** Resource deadlock would occur. */
    export const ERRNO_DEADLK              = <Errno>16;

    /** Destination address required. */
    export const ERRNO_DESTADDRREQ         = <Errno>17;

    /** Mathematics argument out of domain of function. */
    export const ERRNO_DOM                 = <Errno>18; // Domain, not Document Object Model

    /** @hidden Reserved. */
    export const ERRNO_DQUOT               = <Errno>19;

    /** File exists. */
    export const ERRNO_EXIST               = <Errno>20;

    /** Bad address. */
    export const ERRNO_FAULT               = <Errno>21;

    /** File too large. */
    export const ERRNO_FBIG                = <Errno>22;

    /** Host is unreachable. */
    export const ERRNO_HOSTUNREACH         = <Errno>23;

    /** Identifier removed. */
    export const ERRNO_IDRM                = <Errno>24;

    /** Illegal byte sequence. */
    export const ERRNO_ILSEQ               = <Errno>25;

    /** Operation in progress. */
    export const ERRNO_INPROGRESS          = <Errno>26;

    /** Interrupted function. */
    export const ERRNO_INTR                = <Errno>27;

    /** Invalid argument. */
    export const ERRNO_INVAL               = <Errno>28;

    /** I/O error. */
    export const ERRNO_IO                  = <Errno>29;

    /** Socket is connected. */
    export const ERRNO_ISCONN              = <Errno>30;

    /** Is a directory. */
    export const ERRNO_ISDIR               = <Errno>31;

    /** Too many levels of symbolic links. */
    export const ERRNO_LOOP                = <Errno>32;

    /** File descriptor value too large. */
    export const ERRNO_MFILE               = <Errno>33;

    /** Too many links. */
    export const ERRNO_MLINK               = <Errno>34;

    /** Message too large. */
    export const ERRNO_MSGSIZE             = <Errno>35;

    /** @hidden Reserved. */
    export const ERRNO_MULTIHOP            = <Errno>36;

    /** Filename too long. */
    export const ERRNO_NAMETOOLONG         = <Errno>37;

    /** Network is down. */
    export const ERRNO_NETDOWN             = <Errno>38;

    /** Connection aborted by network. */
    export const ERRNO_NETRESET            = <Errno>39;

    /** Network unreachable. */
    export const ERRNO_NETUNREACH          = <Errno>40;

    /** Too many files open in system. */
    export const ERRNO_NFILE               = <Errno>41;

    /** No buffer space available. */
    export const ERRNO_NOBUFS              = <Errno>42;

    /** No such device. */
    export const ERRNO_NODEV               = <Errno>43;

    /** No such file or directory. */
    export const ERRNO_NOENT               = <Errno>44;

    /** Executable file format error. */
    export const ERRNO_NOEXEC              = <Errno>45;

    /** No locks available. */
    export const ERRNO_NOLCK               = <Errno>46;

    /** @hidden Reserved. */
    export const ERRNO_NOLINK              = <Errno>47;

    /** Not enough space. */
    export const ERRNO_NOMEM               = <Errno>48;

    /** No message of the desired export type. */
    export const ERRNO_NOMSG               = <Errno>49;

    /** Protocol not available. */
    export const ERRNO_NOPROTOOPT          = <Errno>50;

    /** No space left on device. */
    export const ERRNO_NOSPC               = <Errno>51;

    /** Function not supported. */
    export const ERRNO_NOSYS               = <Errno>52;

    /** The socket is not connected. */
    export const ERRNO_NOTCONN             = <Errno>53;

    /** Not a directory or a symbolic link to a directory. */
    export const ERRNO_NOTDIR              = <Errno>54;

    /** Directory not empty. */
    export const ERRNO_NOTEMPTY            = <Errno>55;

    /** State not recoverable. */
    export const ERRNO_NOTRECOVERABLE      = <Errno>56;

    /** Not a socket. */
    export const ERRNO_NOTSOCK             = <Errno>57;

    /** Not supported, or operation not supported on socket. */
    export const ERRNO_NOTSUP              = <Errno>58;

    /** Inappropriate I/O control operation. */
    export const ERRNO_NOTTY               = <Errno>59;

    /** No such device or address. */
    export const ERRNO_NXIO                = <Errno>60;

    /** Value too large to be stored in data export type. */
    export const ERRNO_OVERFLOW            = <Errno>61;

    /** Previous owned died. */
    export const ERRNO_OWNERDEAD           = <Errno>62;

    /** Operation not permitted. */
    export const ERRNO_PERM                = <Errno>63;

    /** Broken pipe. */
    export const ERRNO_PIPE                = <Errno>64;

    /** Protocol error. */
    export const ERRNO_PROTO               = <Errno>65;

    /** Protocol not supported. */
    export const ERRNO_PROTONOSUPPORT      = <Errno>66;

    /** Protocol wrong export type for socket. */
    export const ERRNO_PROTOTYPE           = <Errno>67;

    /** Result too large. */
    export const ERRNO_RANGE               = <Errno>68;

    /** Read-only file system. */
    export const ERRNO_ROFS                = <Errno>69;

    /** Invalid seek. */
    export const ERRNO_SPIPE               = <Errno>70;

    /** No such process. */
    export const ERRNO_SRCH                = <Errno>71;

    /** @hidden Reserved. */
    export const ERRNO_STALE               = <Errno>72;

    /** Connection timed out. */
    export const ERRNO_TIMEDOUT            = <Errno>73;

    /** Text file busy. */
    export const ERRNO_TXTBSY              = <Errno>74;

    /** Cross-device link. */
    export const ERRNO_XDEV                = <Errno>75;

    /** Extension: Capabilities insufficient. */
    export const ERRNO_NOTCAPABLE          = <Errno>76;

    /** Extension: Execution has been paused through asyncification. */
    export const ERRNO_ASYNCIFY            = <Errno>9001;

    export function errno_string(errno: Errno): string | undefined {
        switch (errno) {
            case ERRNO_SUCCESS:         return "SUCCESS";
            case ERRNO_2BIG:            return "2BIG";
            case ERRNO_ACCESS:          return "ACCESS";
            case ERRNO_ADDRINUSE:       return "ADDRINUSE";
            case ERRNO_ADDRNOTAVAIL:    return "ADDRNOTAVAIL";
            case ERRNO_AFNOSUPPORT:     return "AFNOSUPPORT";
            case ERRNO_AGAIN:           return "AGAIN";
            case ERRNO_ALREADY:         return "ALREADY";
            case ERRNO_BADF:            return "BADF";
            case ERRNO_BADMSG:          return "BADMSG";
            case ERRNO_BUSY:            return "BUSY";
            case ERRNO_CANCELED:        return "CANCELED";
            case ERRNO_CHILD:           return "CHILD";
            case ERRNO_CONNABORTED:     return "CONNABORTED";
            case ERRNO_CONNREFUSED:     return "CONNREFUSED";
            case ERRNO_CONNRESET:       return "CONNRESET";
            case ERRNO_DEADLK:          return "DEADLK";
            case ERRNO_DESTADDRREQ:     return "DESTADDRREQ";
            case ERRNO_DOM:             return "DOM";
            case ERRNO_DQUOT:           return "DQUOT";
            case ERRNO_EXIST:           return "EXIST";
            case ERRNO_FAULT:           return "FAULT";
            case ERRNO_FBIG:            return "FBIG";
            case ERRNO_HOSTUNREACH:     return "HOSTUNREACH";
            case ERRNO_IDRM:            return "IDRM";
            case ERRNO_ILSEQ:           return "ILSEQ";
            case ERRNO_INPROGRESS:      return "INPROGRESS";
            case ERRNO_INTR:            return "INTR";
            case ERRNO_INVAL:           return "INVAL";
            case ERRNO_IO:              return "IO";
            case ERRNO_ISCONN:          return "ISCONN";
            case ERRNO_ISDIR:           return "ISDIR";
            case ERRNO_LOOP:            return "LOOP";
            case ERRNO_MFILE:           return "MFILE";
            case ERRNO_MLINK:           return "MLINK";
            case ERRNO_MSGSIZE:         return "MSGSIZE";
            case ERRNO_MULTIHOP:        return "MULTIHOP";
            case ERRNO_NAMETOOLONG:     return "NAMETOOLONG";
            case ERRNO_NETDOWN:         return "NETDOWN";
            case ERRNO_NETRESET:        return "NETRESET";
            case ERRNO_NETUNREACH:      return "NETUNREACH";
            case ERRNO_NFILE:           return "NFILE";
            case ERRNO_NOBUFS:          return "NOBUFS";
            case ERRNO_NODEV:           return "NODEV";
            case ERRNO_NOENT:           return "NOENT";
            case ERRNO_NOEXEC:          return "NOEXEC";
            case ERRNO_NOLCK:           return "NOLCK";
            case ERRNO_NOLINK:          return "NOLINK";
            case ERRNO_NOMEM:           return "NOMEM";
            case ERRNO_NOMSG:           return "NOMSG";
            case ERRNO_NOPROTOOPT:      return "NOPROTOOPT";
            case ERRNO_NOSPC:           return "NOSPC";
            case ERRNO_NOSYS:           return "NOSYS";
            case ERRNO_NOTCONN:         return "NOTCONN";
            case ERRNO_NOTDIR:          return "NOTDIR";
            case ERRNO_NOTEMPTY:        return "NOTEMPTY";
            case ERRNO_NOTRECOVERABLE:  return "NOTRECOVERABLE";
            case ERRNO_NOTSOCK:         return "NOTSOCK";
            case ERRNO_NOTSUP:          return "NOTSUP";
            case ERRNO_NOTTY:           return "NOTTY";
            case ERRNO_NXIO:            return "NXIO";
            case ERRNO_OVERFLOW:        return "OVERFLOW";
            case ERRNO_OWNERDEAD:       return "OWNERDEAD";
            case ERRNO_PERM:            return "PERM";
            case ERRNO_PIPE:            return "PIPE";
            case ERRNO_PROTO:           return "PROTO";
            case ERRNO_PROTONOSUPPORT:  return "PROTONOSUPPORT";
            case ERRNO_PROTOTYPE:       return "PROTOTYPE";
            case ERRNO_RANGE:           return "RANGE";
            case ERRNO_ROFS:            return "ROFS";
            case ERRNO_SPIPE:           return "SPIPE";
            case ERRNO_SRCH:            return "SRCH";
            case ERRNO_STALE:           return "STALE";
            case ERRNO_TIMEDOUT:        return "TIMEDOUT";
            case ERRNO_TXTBSY:          return "TXTBSY";
            case ERRNO_XDEV:            return "XDEV";
            case ERRNO_NOTCAPABLE:      return "NOTCAPABLE";
            case ERRNO_ASYNCIFY:        return "ASYNCIFY";
        }
    }
}
