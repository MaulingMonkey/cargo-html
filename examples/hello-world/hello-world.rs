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

    std::fs::write("asdf1.txt", "example text 1").unwrap();
    std::fs::write("/asdf2.txt", "example text 2").unwrap();
    std::fs::write("/home/asdf3.txt", "example text 3").unwrap();

    assert!(std::fs::read_to_string("asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("./asdf1.txt").unwrap() == "example text 1");
    assert!(std::fs::read_to_string("/asdf1.txt").unwrap() == "example text 1");

    assert!(std::fs::read_to_string("asdf2.txt").unwrap() == "example text 2");
    assert!(std::fs::read_to_string("/asdf2.txt").unwrap() == "example text 2");
    assert!(std::fs::read_to_string("./asdf2.txt").unwrap() == "example text 2");

    assert!(std::fs::read_to_string("home/asdf3.txt").unwrap() == "example text 3");
    assert!(std::fs::read_to_string("./home/asdf3.txt").unwrap() == "example text 3");
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
