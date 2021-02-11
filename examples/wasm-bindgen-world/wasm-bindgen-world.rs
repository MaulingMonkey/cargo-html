use wasm_bindgen::prelude::*;

use std::collections::HashMap;



#[wasm_bindgen(start)]
pub fn start() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    println!("{:?}", hm);

    std::thread::yield_now();
    std::thread::sleep(std::time::Duration::from_secs(1));
    wasm_bindgen::throw_str("Hello, world!");
}
