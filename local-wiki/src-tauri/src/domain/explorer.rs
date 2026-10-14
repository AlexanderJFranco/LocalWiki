use serde:: Serialize;

//Info React needs to render an explorer item
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerEntry{
    pub name: String,
    pub relative_path: String,
    pub is_directory: bool,
}