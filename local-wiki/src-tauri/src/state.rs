use std::path::PathBuf;
use std::sync::Mutex;

//Shared applicaiton state
pub struct AppState{
    pub active_library: Mutex<Option<PathBuf>>,
}

impl Default for AppState{
    fn default() -> Self {
        Self{
            active_library: Mutex::new(None),
        }
    }
}