use std::path::{Path, PathBuf};
use std::sync::Mutex;

use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{AeadCore, Aes256Gcm, Key, Nonce};
use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params_from_iter, types::ValueRef, Connection};
use serde::Serialize;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

pub struct DbState {
    conn: Mutex<Option<Connection>>,
    db_path: PathBuf,
    enc_path: PathBuf,
    enc_key: [u8; 32],
}

#[derive(Serialize)]
pub struct ExecResult {
    #[serde(rename = "rowsAffected")]
    pub rows_affected: usize,
    #[serde(rename = "lastInsertId")]
    pub last_insert_id: i64,
}

// ---------------------------------------------------------------------------
// DbState implementation
// ---------------------------------------------------------------------------

impl DbState {
    /// Initialise the database.
    ///
    /// - If an encrypted copy exists on disk and no working copy is present,
    ///   it is decrypted first.
    /// - If only a plaintext working copy exists (pre-encryption upgrade),
    ///   it is used directly and an encrypted copy is created.
    /// - On a fresh install, SQLite creates the file automatically.
    pub fn init(app_data_dir: &Path) -> Result<Self, String> {
        let db_path = app_data_dir.join("xiuhua.db");
        let enc_path = app_data_dir.join("xiuhua.db.enc");
        let enc_key = derive_enc_key();

        std::fs::create_dir_all(app_data_dir)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;

        if !db_path.exists() && enc_path.exists() {
            decrypt_file(&enc_path, &db_path, &enc_key)?;
        }

        let conn =
            Connection::open(&db_path).map_err(|e| format!("无法打开数据库: {}", e))?;
        conn.execute_batch("PRAGMA journal_mode = DELETE")
            .map_err(|e| format!("设置日志模式失败: {}", e))?;

        run_migrations(&conn)?;

        persist_encrypted(&db_path, &enc_path, &enc_key)?;

        Ok(Self {
            conn: Mutex::new(Some(conn)),
            db_path,
            enc_path,
            enc_key,
        })
    }

    pub fn execute(&self, sql: &str, params: &[Value]) -> Result<ExecResult, String> {
        let guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
        let conn = guard.as_ref().ok_or("数据库未连接".to_string())?;

        let converted = convert_param_style(sql);
        let native = to_native_params(params);

        let rows_affected = conn
            .execute(&converted, params_from_iter(native.iter()))
            .map_err(|e| format!("执行失败: {}", e))?;

        let last_insert_id = conn.last_insert_rowid();

        drop(guard);
        let _ = self.sync_encrypted();

        Ok(ExecResult {
            rows_affected,
            last_insert_id,
        })
    }

    pub fn select(&self, sql: &str, params: &[Value]) -> Result<Vec<Value>, String> {
        let guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
        let conn = guard.as_ref().ok_or("数据库未连接".to_string())?;

        let converted = convert_param_style(sql);
        let native = to_native_params(params);

        let mut stmt = conn
            .prepare(&converted)
            .map_err(|e| format!("准备查询失败: {}", e))?;

        let columns: Vec<String> = stmt.column_names().iter().map(|c| c.to_string()).collect();

        let rows = stmt
            .query_map(params_from_iter(native.iter()), |row| {
                let mut obj = Map::new();
                for (i, col) in columns.iter().enumerate() {
                    let val = match row.get_ref(i)? {
                        ValueRef::Null => Value::Null,
                        ValueRef::Integer(n) => Value::Number(n.into()),
                        ValueRef::Real(f) => Value::Number(
                            serde_json::Number::from_f64(f).unwrap_or_else(|| 0i64.into()),
                        ),
                        ValueRef::Text(t) => {
                            Value::String(String::from_utf8_lossy(t).into_owned())
                        }
                        ValueRef::Blob(b) => Value::String(STANDARD.encode(b)),
                    };
                    obj.insert(col.clone(), val);
                }
                Ok(Value::Object(obj))
            })
            .map_err(|e| format!("查询失败: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("读取结果失败: {}", e))
    }

    /// Close the connection, encrypt the working copy, and remove plaintext.
    pub fn close(&self) -> Result<(), String> {
        let mut guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
        if let Some(conn) = guard.take() {
            conn.close()
                .map_err(|(_, e)| format!("关闭数据库失败: {}", e))?;
        }
        persist_encrypted(&self.db_path, &self.enc_path, &self.enc_key)?;
        cleanup_working_files(&self.db_path);
        Ok(())
    }

    /// Create an encrypted backup at `dest`.
    pub fn backup(&self, dest: &str) -> Result<(), String> {
        let guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
        let conn = guard.as_ref().ok_or("数据库未连接".to_string())?;

        if let Some(parent) = Path::new(dest).parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("创建备份目录失败: {}", e))?;
        }

        let tmp = self.db_path.with_file_name("xiuhua_backup_tmp.db");
        let escaped = tmp.to_string_lossy().replace('\\', "/").replace('\'', "''");
        conn.execute_batch(&format!("VACUUM INTO '{}'", escaped))
            .map_err(|e| format!("导出备份失败: {}", e))?;

        let plaintext = std::fs::read(&tmp).map_err(|e| format!("读取备份失败: {}", e))?;
        let _ = std::fs::remove_file(&tmp);

        let encrypted =
            encrypt_bytes(&plaintext, &self.enc_key).map_err(|e| format!("加密备份失败: {}", e))?;
        std::fs::write(dest, encrypted).map_err(|e| format!("写入备份失败: {}", e))?;

        Ok(())
    }

    /// Restore from an encrypted backup (or a legacy plaintext backup).
    pub fn restore(&self, src: &str) -> Result<(), String> {
        let src_path = Path::new(src);
        if !src_path.exists() {
            return Err("备份文件不存在".to_string());
        }

        let raw = std::fs::read(src_path).map_err(|e| format!("读取备份文件失败: {}", e))?;

        let plaintext = match decrypt_bytes(&raw, &self.enc_key) {
            Ok(data) => data,
            Err(_) => {
                // Fall back to legacy plaintext SQLite backup
                if raw.starts_with(b"SQLite format 3\0") {
                    raw
                } else {
                    return Err(
                        "备份文件解密失败（加密备份只能在同一台机器上恢复）".to_string(),
                    );
                }
            }
        };

        {
            let mut guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
            if let Some(conn) = guard.take() {
                let _ = conn.close();
            }
        }

        std::fs::write(&self.db_path, plaintext)
            .map_err(|e| format!("写入恢复数据失败: {}", e))?;

        let conn = Connection::open(&self.db_path)
            .map_err(|e| format!("打开恢复数据库失败: {}", e))?;
        conn.execute_batch("PRAGMA journal_mode = DELETE")
            .map_err(|e| format!("设置日志模式失败: {}", e))?;

        persist_encrypted(&self.db_path, &self.enc_path, &self.enc_key)?;

        let mut guard = self.conn.lock().map_err(|_| "数据库锁定失败".to_string())?;
        *guard = Some(conn);

        Ok(())
    }

    fn sync_encrypted(&self) -> Result<(), String> {
        persist_encrypted(&self.db_path, &self.enc_path, &self.enc_key)
    }
}

// ---------------------------------------------------------------------------
// Encryption key derivation
// ---------------------------------------------------------------------------

fn derive_enc_key() -> [u8; 32] {
    #[cfg(debug_assertions)]
    {
        Sha256::digest(b"XIUHUA_DEV_ENCRYPTION_KEY").into()
    }

    #[cfg(not(debug_assertions))]
    {
        let hwid = crate::license::get_hardware_id()
            .unwrap_or_else(|_| "XIUHUA_FALLBACK_HWID".to_string());
        let combined = format!("XIUHUA_DB_SEAL|{}", hwid);
        Sha256::digest(combined.as_bytes()).into()
    }
}

// ---------------------------------------------------------------------------
// AES-256-GCM encrypt / decrypt
// ---------------------------------------------------------------------------

fn encrypt_bytes(plaintext: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|_| "AES-GCM 加密失败".to_string())?;

    // nonce (12 bytes) || ciphertext
    let mut out = Vec::with_capacity(12 + ciphertext.len());
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

fn decrypt_bytes(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("加密数据格式无效".to_string());
    }
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "解密失败：密钥不匹配或数据已损坏".to_string())
}

// ---------------------------------------------------------------------------
// File-level helpers
// ---------------------------------------------------------------------------

fn decrypt_file(enc_path: &Path, db_path: &Path, key: &[u8; 32]) -> Result<(), String> {
    let encrypted = std::fs::read(enc_path).map_err(|e| format!("读取加密数据库失败: {}", e))?;
    let plaintext = decrypt_bytes(&encrypted, key)?;
    std::fs::write(db_path, plaintext).map_err(|e| format!("写入数据库失败: {}", e))?;
    Ok(())
}

fn persist_encrypted(db_path: &Path, enc_path: &Path, key: &[u8; 32]) -> Result<(), String> {
    if !db_path.exists() {
        return Ok(());
    }
    let data = std::fs::read(db_path).map_err(|e| format!("读取数据库失败: {}", e))?;
    let encrypted = encrypt_bytes(&data, key)?;
    let tmp = enc_path.with_extension("enc.tmp");
    std::fs::write(&tmp, encrypted).map_err(|e| format!("写入加密数据库失败: {}", e))?;
    std::fs::rename(&tmp, enc_path).map_err(|e| format!("更新加密数据库失败: {}", e))?;
    Ok(())
}

fn cleanup_working_files(db_path: &Path) {
    let _ = std::fs::remove_file(db_path);
    if let Some(name) = db_path.file_name() {
        let name = name.to_string_lossy();
        for suffix in &["-wal", "-shm", "-journal"] {
            let p = db_path.with_file_name(format!("{}{}", name, suffix));
            let _ = std::fs::remove_file(p);
        }
    }
}

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------

fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(include_str!("../migrations/001_core_tables.sql"))
        .map_err(|e| format!("数据库迁移失败: {}", e))
}

// ---------------------------------------------------------------------------
// SQL parameter style conversion  ($1 → ?1)
// ---------------------------------------------------------------------------

fn convert_param_style(sql: &str) -> String {
    let mut out = String::with_capacity(sql.len());
    let mut chars = sql.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '$' {
            if let Some(&next) = chars.peek() {
                if next.is_ascii_digit() {
                    out.push('?');
                    continue;
                }
            }
        }
        out.push(ch);
    }
    out
}

fn to_native_params(values: &[Value]) -> Vec<rusqlite::types::Value> {
    values
        .iter()
        .map(|v| match v {
            Value::Null => rusqlite::types::Value::Null,
            Value::Bool(b) => rusqlite::types::Value::Integer(i64::from(*b)),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    rusqlite::types::Value::Real(f)
                } else {
                    rusqlite::types::Value::Null
                }
            }
            Value::String(s) => rusqlite::types::Value::Text(s.clone()),
            _ => rusqlite::types::Value::Text(v.to_string()),
        })
        .collect()
}
