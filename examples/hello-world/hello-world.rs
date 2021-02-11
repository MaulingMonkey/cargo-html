use std::collections::HashMap;
use std::io::Write;

fn main() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    println!("{:?}", hm);

    std::thread::yield_now();
    std::thread::sleep(std::time::Duration::from_secs(1));

    print!("What's your name? ");
    std::io::stdout().flush().unwrap();

    let mut name = String::new();
    std::io::stdin().read_line(&mut name).unwrap();
    let name = name.trim();

    println!("Hello, {}!", name);
}
