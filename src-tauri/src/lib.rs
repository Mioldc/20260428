use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use serde_json::Value;
use tauri::{AppHandle, Manager, State};

mod database;
mod license;

#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| format!("哈希失败: {}", e))
}

#[tauri::command]
fn verify_password(password: String, hash: String) -> Result<bool, String> {
    let parsed = PasswordHash::new(&hash).map_err(|e| format!("哈希格式无效: {}", e))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

#[tauri::command]
fn db_execute(
    state: State<'_, database::DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<database::ExecResult, String> {
    state.execute(&sql, &params)
}

#[tauri::command]
fn db_select(
    state: State<'_, database::DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<Vec<Value>, String> {
    state.select(&sql, &params)
}

#[tauri::command]
fn db_close(state: State<'_, database::DbState>) -> Result<(), String> {
    state.close()
}

#[tauri::command]
fn backup_database(state: State<'_, database::DbState>, dest: String) -> Result<(), String> {
    state.backup(&dest)
}

#[tauri::command]
fn restore_database(state: State<'_, database::DbState>, src: String) -> Result<(), String> {
    state.restore(&src)
}

#[tauri::command]
fn get_hardware_id() -> Result<String, String> {
    license::get_hardware_id()
}

#[tauri::command]
fn check_license(app: AppHandle) -> Result<license::LicenseInfo, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let result = license::load_and_verify(&app_data);

    #[cfg(debug_assertions)]
    if result.is_err() {
        let hwid = license::get_hardware_id().unwrap_or_else(|_| "DEV".to_string());
        return Ok(license::LicenseInfo {
            valid: true,
            hardware_id: hwid,
            product: "xiuhua".to_string(),
            edition: "开发版".to_string(),
            expires_at: None,
        });
    }

    result
}

#[tauri::command]
fn activate_license(app: AppHandle, path: String) -> Result<license::LicenseInfo, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    license::import_and_verify(&app_data, &path)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?;
            let db = database::DbState::init(&app_data)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            app.manage(db);
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            hash_password,
            verify_password,
            db_execute,
            db_select,
            db_close,
            backup_database,
            restore_database,
            get_hardware_id,
            check_license,
            activate_license,
        ])
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
