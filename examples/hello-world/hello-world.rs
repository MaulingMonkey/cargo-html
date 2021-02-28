use std::collections::HashMap;
use std::io::Write;

fn main() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    println!("{:?}", hm);

    eprintln!("std::env::current_dir: {:?}", std::env::current_dir());
    eprintln!("std::env::args: {:?}", std::env::args().collect::<Vec<String>>());
    eprintln!("std::env::vars: {:?}", std::env::vars().collect::<Vec<(String, String)>>());

    std::fs::create_dir_all("/path/to/some/subdir").unwrap();
    std::fs::write("asdf1.txt", "example text 1").unwrap();
    std::fs::write("/asdf2.txt", "example text 2").unwrap();
    std::fs::write("/home/asdf3.txt", "example text 3").unwrap();
    std::fs::write("/path/to/some/subdir/asdf4.txt", "example text 4").unwrap();

    assert!(std::fs::read_to_string("asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("./asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("/asdf1.txt").unwrap() == "example text 1");

    assert!(std::fs::read_to_string("asdf2.txt").unwrap() == "example text 2");
    assert!(std::fs::read_to_string("/asdf2.txt").unwrap() == "example text 2");
    assert!(std::fs::read_to_string("./asdf2.txt").unwrap() == "example text 2");

    assert!(std::fs::read_to_string("home/asdf3.txt").unwrap() == "example text 3");
    assert!(std::fs::read_to_string("./home/asdf3.txt").unwrap() == "example text 3");
    assert!(std::fs::read_to_string("/home/asdf3.txt").unwrap() == "example text 3");

    assert!(std::fs::read_to_string("path/to/some/subdir/asdf4.txt").unwrap() == "example text 4");
    assert!(std::fs::read_to_string("./path/to/some/subdir/asdf4.txt").unwrap() == "example text 4");
    assert!(std::fs::read_to_string("/path/to/some/subdir/asdf4.txt").unwrap() == "example text 4");

    for e in std::fs::read_dir("/").unwrap() {
        let e = e.unwrap();
        println!("{} {}", if e.path().is_dir() { "dir " } else { "file" }, e.path().display());
    }
    for e in std::fs::read_dir("/home").unwrap() {
        let e = e.unwrap();
        println!("{} {}", if e.path().is_dir() { "dir " } else { "file" }, e.path().display());
    }

    assert!(std::fs::remove_dir("/path/to/some/subdir/asdf4.txt").is_err());    // not a dir
    assert!(std::fs::remove_dir("/path/to/some/subdir/").is_err());             // not empty
    assert!(std::fs::remove_file("/path/to/some/subdir/asdf5.txt").is_err());   // doesn't exist
    std::fs::remove_file("/path/to/some/subdir/asdf4.txt").unwrap();
    std::fs::remove_dir("/path/to/some/subdir").unwrap();
    std::fs::remove_dir("/path/to/some").unwrap();
    std::fs::remove_dir("/path/to").unwrap();

    std::thread::yield_now();
    std::thread::sleep(std::time::Duration::from_secs(1));

    println!("\u{001B}[30;102m{:^1$}\u{001B}[0m", "Hello, world!", 76);

    print!("What's your name? ");
    std::io::stdout().flush().unwrap();

    let mut name = String::new();
    std::io::stdin().read_line(&mut name).unwrap();
    let name = name.trim();

    println!("Hello, {}!", name);
}
