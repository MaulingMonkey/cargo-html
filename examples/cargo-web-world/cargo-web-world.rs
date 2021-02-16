#[cfg(target_arch = "wasm32")] use stdweb::*;

use std::collections::HashMap;



fn main() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    //println!("{:?}", hm);

    std::thread::yield_now();
    #[cfg(target_arch = "wasm32")] js! { alert("Hello, world!"); };
    #[cfg(not(target_arch = "wasm32"))] println!("Hello, world!");
}
