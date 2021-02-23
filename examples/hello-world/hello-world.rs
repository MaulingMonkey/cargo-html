use std::collections::HashMap;
use std::io::Write;

fn main() {
    //  __wasilibc_find_relpath             https://rust-lang.github.io/libc/wasm32-wasi/libc/fn.__wasilibc_find_relpath.html
    //  __wasilibc_register_preopened_fd    https://rust-lang.github.io/libc/wasm32-wasi/libc/fn.__wasilibc_register_preopened_fd.html
    //
    //  https://github.com/rust-lang/rust/blob/14265f9c5558e599ba8908cffc717f26389420e1/library/std/src/sys/wasi/fs.rs#L650
    //  https://github.com/WebAssembly/wasi-libc/blob/f2e779e5f1ba4a539937cedeeaa762c1e0c162df/libc-bottom-half/sources/preopens.c
    //
    assert!(0 == unsafe { libc::__wasilibc_register_preopened_fd(3, "/\0".as_ptr().cast()) });
    assert!(0 == unsafe { libc::__wasilibc_register_preopened_fd(4, ".\0".as_ptr().cast()) });
    //unsafe { wasi::proc_raise(wasi::SIGNAL_TRAP); }

    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    println!("{:?}", hm);

    eprintln!("std::env::args: {:?}", std::env::args().collect::<Vec<String>>());
    eprintln!("std::env::vars: {:?}", std::env::vars().collect::<Vec<(String, String)>>());

    std::fs::write("asdf1.txt", "example text 1").unwrap();
    std::fs::write("/asdf2.txt", "example text 2").unwrap();
    std::fs::write("/home/asdf3.txt", "example text 3").unwrap();

    assert!(std::fs::read_to_string("asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("./asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("/home/asdf1.txt").unwrap() == "example text 1");

    assert!(std::fs::read_to_string("/asdf2.txt").unwrap() == "example text 2");
    assert!(std::fs::read_to_string("../asdf2.txt").unwrap() == "example text 2");

    assert!(std::fs::read_to_string("asdf3.txt").unwrap() == "example text 3");
    assert!(std::fs::read_to_string("./asdf3.txt").unwrap() == "example text 3");
    assert!(std::fs::read_to_string("/home/asdf3.txt").unwrap() == "example text 3");

    // TODO: subdirs

    std::thread::yield_now();
    std::thread::sleep(std::time::Duration::from_secs(1));

    print!("What's your name? ");
    std::io::stdout().flush().unwrap();

    let mut name = String::new();
    std::io::stdin().read_line(&mut name).unwrap();
    let name = name.trim();

    println!("Hello, {}!", name);
}
