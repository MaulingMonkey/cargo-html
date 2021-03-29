use wasm_bindgen::prelude::*;

use std::collections::HashMap;



#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

pub fn main() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    //println!("{:?}", hm);

    std::thread::yield_now();
    alert("Hello, world!");
}
