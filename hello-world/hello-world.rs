use std::io::Write;

fn main() {
    print!("What's your name? ");
    std::io::stdout().flush().unwrap();

    let mut name = String::new();
    std::io::stdin().read_line(&mut name).unwrap();
    let name = name.trim();

    println!("Hello, {}!", name);
}
