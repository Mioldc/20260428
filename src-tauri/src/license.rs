use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

#[cfg(not(debug_assertions))]
use ed25519_dalek::{Signature, Verifier, VerifyingKey};

#[cfg(not(debug_assertions))]
const PUBLIC_KEY_BYTES: &[u8; 32] = include_bytes!("../keys/public_key.bin");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseFile {
    pub hardware_id: String,
    pub product: String,
    pub edition: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LicenseInfo {
    pub valid: bool,
    pub hardware_id: String,
    pub product: String,
    pub edition: String,
    pub expires_at: Option<String>,
}

pub fn get_hardware_id() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    return get_hardware_id_windows();

    #[cfg(not(target_os = "windows"))]
    return Err("仅支持 Windows 平台".to_string());
}

#[cfg(target_os = "windows")]
fn get_hardware_id_windows() -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let script = r#"$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId
$disk = (Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber
$board = (Get-CimInstance Win32_BaseBoard | Select-Object -First 1).SerialNumber
"$cpu|$disk|$board""#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("获取硬件信息失败: {}", e))?;

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() || raw == "||" {
        return Err("无法获取硬件信息".to_string());
    }

    let combined = format!("XIUHUA|{}", raw);
    let hash = Sha256::digest(combined.as_bytes());
    Ok(STANDARD.encode(hash))
}

#[cfg(not(debug_assertions))]
fn build_sign_payload(lic: &LicenseFile) -> Vec<u8> {
    format!(
        "{}|{}|{}|{}",
        lic.hardware_id,
        lic.product,
        lic.edition,
        lic.expires_at.as_deref().unwrap_or("")
    )
    .into_bytes()
}

fn verify_signature(license: &LicenseFile) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        let _ = license;
        return Ok(());
    }

    #[cfg(not(debug_assertions))]
    {
        let verifying_key = VerifyingKey::from_bytes(PUBLIC_KEY_BYTES)
            .map_err(|_| "授权公钥未配置。请运行 license_tool keygen 并重新构建应用。".to_string())?;

        let sig_bytes = STANDARD
            .decode(&license.signature)
            .map_err(|_| "许可证签名格式无效".to_string())?;

        let sig_array: [u8; 64] = sig_bytes
            .try_into()
            .map_err(|_| "许可证签名长度无效".to_string())?;

        let signature = Signature::from_bytes(&sig_array);
        let payload = build_sign_payload(license);

        verifying_key
            .verify(&payload, &signature)
            .map_err(|_| "许可证签名验证失败".to_string())
    }
}

fn check_expiration(license: &LicenseFile) -> Result<(), String> {
    if let Some(ref expires_at) = license.expires_at {
        let expires = chrono::NaiveDate::parse_from_str(expires_at, "%Y-%m-%d")
            .map_err(|_| "许可证日期格式无效".to_string())?;
        let today = chrono::Local::now().date_naive();
        if today > expires {
            return Err(format!("许可证已过期 ({})", expires_at));
        }
    }
    Ok(())
}

pub fn load_and_verify(app_data_dir: &Path) -> Result<LicenseInfo, String> {
    let license_path = app_data_dir.join("license.lic");
    let content =
        fs::read_to_string(&license_path).map_err(|_| "未找到授权文件".to_string())?;

    let license: LicenseFile =
        serde_json::from_str(&content).map_err(|e| format!("授权文件格式无效: {}", e))?;

    verify_signature(&license)?;
    check_expiration(&license)?;

    let current_hwid = get_hardware_id()?;
    if license.hardware_id != current_hwid {
        return Err("授权文件与当前设备不匹配".to_string());
    }

    Ok(LicenseInfo {
        valid: true,
        hardware_id: license.hardware_id,
        product: license.product,
        edition: license.edition,
        expires_at: license.expires_at,
    })
}

pub fn import_and_verify(app_data_dir: &Path, source_path: &str) -> Result<LicenseInfo, String> {
    let content =
        fs::read_to_string(source_path).map_err(|e| format!("无法读取授权文件: {}", e))?;

    let license: LicenseFile =
        serde_json::from_str(&content).map_err(|e| format!("授权文件格式无效: {}", e))?;

    verify_signature(&license)?;
    check_expiration(&license)?;

    let current_hwid = get_hardware_id()?;
    if license.hardware_id != current_hwid {
        return Err("授权文件与当前设备不匹配".to_string());
    }

    fs::create_dir_all(app_data_dir).map_err(|e| format!("创建目录失败: {}", e))?;
    let dest = app_data_dir.join("license.lic");
    fs::write(&dest, &content).map_err(|e| format!("保存授权文件失败: {}", e))?;

    Ok(LicenseInfo {
        valid: true,
        hardware_id: license.hardware_id,
        product: license.product,
        edition: license.edition,
        expires_at: license.expires_at,
    })
}
