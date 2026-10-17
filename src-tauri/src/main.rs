#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn create_pet(app: tauri::AppHandle, label: String, char_id: String, title: String) -> Result<(), String> {
    let url_str = format!("pet.html?pet={}", char_id);
    WebviewWindowBuilder::new(&app, label.as_str(), WebviewUrl::App(url_str.into()))
        .title(title)
        .inner_size(220.0, 240.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close_pet(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(label.as_str()) {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn emit_pet_stop(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(label.as_str()) {
        win.emit("pet-stop", ()).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![create_pet, close_pet, emit_pet_stop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
