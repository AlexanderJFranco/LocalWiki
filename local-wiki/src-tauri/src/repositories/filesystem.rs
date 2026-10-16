use std::fs;
use std::path::Path;

use crate::domain::explorer::ExplorerEntry;


//Read a single file
pub fn read_file(path: &Path) -> Result<String, String> {

    // Read the file and convert its contents into a String.
    // read_to_string expects valid UTF-8 text.
    //
    // ? extracts the text if successful or returns the error.
    fs::read_to_string(path)
        .map_err(|error| error.to_string())
}

// Reads only the immediate children of a directory.
pub fn read_directory(
    directory: &Path,
    root: &Path,
) -> Result<Vec<ExplorerEntry>, String> {

    // Collect the results into a vector (like an array).
    let mut entries = Vec::new();

    // Open the directory, returning a readable error on failure.
    let items = fs::read_dir(directory)
        .map_err(|error| error.to_string())?;

    for item in items {
        let item = item.map_err(|error| error.to_string())?;

        // Get filesystem metadata for the entry.
        let file_type = item
            .file_type()
            .map_err(|error| error.to_string())?;

        // Skip symbolic links in our first implementation.
        if file_type.is_symlink() {
            continue;
        }

        // Convert the absolute file path into a library-relative path.
        let relative_path = item
            .path()
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .into_owned();

        entries.push(ExplorerEntry {
            name: item.file_name().to_string_lossy().into_owned(),
            relative_path,
            is_directory: file_type.is_dir(),
        });
    }

    // Directories first, then filenames alphabetically.
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

//UNIT TESTS



#[cfg(test)]
mod tests {
    // Import functions and types from the parent module.
    use super::*;

    #[test]
    fn read_file_returns_contents() {

        // Create a unique temporary directory.
        // tempfile automatically deletes it after the test.
        let directory = tempfile::tempdir().unwrap();

        // Construct a path inside the temporary directory.
        let file_path = directory.path().join("example.md");
        dbg!(&file_path);
        // Create a sample Markdown file.
        fs::write(&file_path, "# Hello Local Wiki").unwrap();

        // ACT: Execute the function we're testing.
        let result = read_file(&file_path);
        dbg!(&result);
        

        // ASSERT: Verify that reading succeeded.
        assert!(result.is_ok());

        // ASSERT: Verify the returned contents.
        assert_eq!(result.unwrap(), "# Hello Local Wiki");
    }

    #[test]
    fn read_file_returns_error_for_missing_file() {

        // Create an isolated temporary directory.
        let directory = tempfile::tempdir().unwrap();

        // Reference a file that does not exist.
        let file_path = directory.path().join("missing.md");

        // Attempt to read it.
        let result = read_file(&file_path);

        // Verify that the function returned an error.
        assert!(result.is_err());
    }
}
