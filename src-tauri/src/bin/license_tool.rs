use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signer, SigningKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::process;

#[derive(Serialize, Deserialize)]
struct LicenseFile {
    hardware_id: String,
    product: String,
    edition: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    expires_at: Option<String>,
    signature: String,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }

    match args[1].as_str() {
        "keygen" => cmd_keygen(),
        "sign" => cmd_sign(&args[2..]),
        "--help" | "-h" | "help" => print_usage(),
        other => {
            eprintln!("未知命令: {}", other);
            print_usage();
            process::exit(1);
        }
    }
}

fn print_usage() {
    eprintln!("绣花厂订单系统 - 授权工具");
    eprintln!();
    eprintln!("用法:");
    eprintln!("  license_tool keygen                    生成 Ed25519 密钥对");
    eprintln!("  license_tool sign <机器码> [选项]       为指定机器码签发授权");
    eprintln!();
    eprintln!("sign 选项:");
    eprintln!("  --product <名称>     产品名称 (默认: xiuhua)");
    eprintln!("  --edition <版本>     版本类型 (默认: standard)");
    eprintln!("  --expires <日期>     过期日期 YYYY-MM-DD (可选, 不设则永久)");
    eprintln!("  --key <路径>         私钥文件 (默认: keys/private_key.bin)");
    eprintln!("  --output <路径>      输出文件 (默认: license.lic)");
}

fn cmd_keygen() {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();

    fs::create_dir_all("keys").expect("无法创建 keys 目录");
    fs::write("keys/private_key.bin", signing_key.to_bytes()).expect("无法保存私钥");
    fs::write("keys/public_key.bin", verifying_key.to_bytes()).expect("无法保存公钥");

    let bytes = verifying_key.to_bytes();
    println!("密钥对已生成:");
    println!("  私钥: keys/private_key.bin  (请妥善保管，切勿泄露!)");
    println!("  公钥: keys/public_key.bin  (已嵌入应用，重新构建即生效)");
    println!();
    println!("公钥字节 (参考):");
    print!("[");
    for (i, b) in bytes.iter().enumerate() {
        if i % 8 == 0 {
            print!("\n    ");
        }
        print!("0x{:02x}", b);
        if i < 31 {
            print!(", ");
        }
    }
    println!("\n]");
}

fn cmd_sign(args: &[String]) {
    if args.is_empty() {
        eprintln!("错误: 请提供机器码");
        eprintln!("用法: license_tool sign <机器码> [选项]");
        process::exit(1);
    }

    let hwid = args[0].clone();
    let mut product = "xiuhua".to_string();
    let mut edition = "standard".to_string();
    let mut expires_at: Option<String> = None;
    let mut key_path = "keys/private_key.bin".to_string();
    let mut output = "license.lic".to_string();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--product" if i + 1 < args.len() => {
                i += 1;
                product = args[i].clone();
            }
            "--edition" if i + 1 < args.len() => {
                i += 1;
                edition = args[i].clone();
            }
            "--expires" if i + 1 < args.len() => {
                i += 1;
                expires_at = Some(args[i].clone());
            }
            "--key" if i + 1 < args.len() => {
                i += 1;
                key_path = args[i].clone();
            }
            "--output" if i + 1 < args.len() => {
                i += 1;
                output = args[i].clone();
            }
            other => {
                eprintln!("未知选项: {}", other);
                process::exit(1);
            }
        }
        i += 1;
    }

    let key_bytes = fs::read(&key_path).unwrap_or_else(|_| {
        eprintln!("无法读取私钥: {}", key_path);
        eprintln!("请先运行: license_tool keygen");
        process::exit(1);
    });

    let key_array: [u8; 32] = key_bytes.try_into().unwrap_or_else(|_| {
        eprintln!("私钥格式无效 (应为 32 字节)");
        process::exit(1);
    });

    let signing_key = SigningKey::from_bytes(&key_array);

    let payload = format!(
        "{}|{}|{}|{}",
        hwid,
        product,
        edition,
        expires_at.as_deref().unwrap_or("")
    );

    let signature = signing_key.sign(payload.as_bytes());
    let sig_b64 = STANDARD.encode(signature.to_bytes());

    let license = LicenseFile {
        hardware_id: hwid,
        product,
        edition,
        expires_at,
        signature: sig_b64,
    };

    let json = serde_json::to_string_pretty(&license).expect("序列化失败");
    fs::write(&output, &json).unwrap_or_else(|e| {
        eprintln!("无法写入授权文件: {}", e);
        process::exit(1);
    });

    println!("授权文件已生成: {}", output);
}
