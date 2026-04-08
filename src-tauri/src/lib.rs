use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn backup_database(app: AppHandle, dest: String) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("xiuhua.db");
    if !db_path.exists() {
        return Err("数据库文件不存在".to_string());
    }
    if let Some(parent) = std::path::Path::new(&dest).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    std::fs::copy(&db_path, &dest).map_err(|e| format!("备份失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn restore_database(app: AppHandle, src: String) -> Result<(), String> {
    let src_path = std::path::Path::new(&src);
    if !src_path.exists() {
        return Err("备份文件不存在".to_string());
    }
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("xiuhua.db");
    std::fs::copy(src_path, &db_path).map_err(|e| format!("恢复失败: {}", e))?;
    Ok(())
}

pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create core tables",
        sql: include_str!("../migrations/001_core_tables.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:xiuhua.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![backup_database, restore_database])
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
