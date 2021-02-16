#![windows_subsystem = "windows"]

use quicksilver::*;
use quicksilver::graphics::*;

fn main() {
    quicksilver::run(quicksilver::Settings {
        title:  "quicksilver demo",
        .. Default::default()
    }, app)
}

async fn app(window: Window, mut gfx: Graphics, mut input: Input) -> quicksilver::Result<()> {
    loop {
        while let Some(_event) = input.next_event().await {
            // ...
        }

        gfx.clear(Color::from_hex("112233"));
        gfx.present(&window)?;
    }
}
