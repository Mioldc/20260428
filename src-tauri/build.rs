fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let keys_dir = std::path::Path::new(&manifest_dir).join("keys");
    let pub_key_path = keys_dir.join("public_key.bin");

    if !pub_key_path.exists() {
        std::fs::create_dir_all(&keys_dir).ok();
        std::fs::write(&pub_key_path, [0u8; 32]).ok();
        println!(
            "cargo:warning=keys/public_key.bin not found — created placeholder. \
             Run `cargo run --bin license_tool -- keygen` to generate real keys."
        );
    }

    println!("cargo:rerun-if-changed=keys/public_key.bin");
    tauri_build::build();
}
