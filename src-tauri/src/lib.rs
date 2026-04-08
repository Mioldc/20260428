use tauri_plugin_sql::{Migration, MigrationKind};

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
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
