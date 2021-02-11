fn main() {
    println!("Goodbye, world!");
    std::thread::sleep(std::time::Duration::from_millis(1000));
    std::process::exit(1);
}
