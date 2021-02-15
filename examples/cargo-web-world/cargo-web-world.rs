use stdweb::*;

use std::collections::HashMap;



fn main() {
    let mut hm = HashMap::new();
    hm.insert("foo", "bar");
    hm.insert("a", "b");
    //println!("{:?}", hm);

    std::thread::yield_now();
    js! { alert("Hello, world!"); };
}
