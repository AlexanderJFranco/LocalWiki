# Local Wiki

A cross-platform desktop wiki application built with **Tauri 2, Rust, React, TypeScript, and Vite**.

Local Wiki is under active development and aims to provide a lightweight, locally stored knowledge-management experience.

## Tech stack

- **Desktop:** Tauri 2
- **Backend:** Rust
- **Frontend:** React, TypeScript, Vite
- **Platforms:** Windows, macOS, Linux

## Prerequisites

Install these on every platform:

- [Git](https://git-scm.com/)
- [Node.js (LTS)](https://nodejs.org/) and npm
- [Rust and Cargo](https://rustup.rs/)

Additional operating-system requirements:

### macOS

Install the Xcode Command Line Tools:

```bash
xcode-select --install
```

### Linux (Ubuntu/Debian)

Install native dependencies required by Tauri:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

For other distributions, see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/).

### Windows

Install Microsoft C++ Build Tools with the **Desktop development with C++** workload. Ensure Microsoft Edge WebView2 is installed (typically available on current Windows versions).

## Clone and run

The following commands work in macOS/Linux terminals and Windows PowerShell, once prerequisites are installed:

```bash
git clone https://github.com/YOUR_USERNAME/local-wiki.git
cd local-wiki
npm ci
npm run tauri dev
```

Replace `YOUR_USERNAME` with your GitHub username. `npm ci` uses the committed `package-lock.json`. `npm run tauri dev` assumes the `tauri` script is configured in `package.json`.

The first launch may take longer while Cargo downloads and compiles Rust dependencies.

## Build a desktop application

```bash
npm run tauri build
```

With the standard Tauri layout, generated bundles appear in:

```text
src-tauri/target/release/bundle/
```

Build formats vary by operating system and Tauri configuration. A build on one platform does not automatically create installers for the others.

## Development commands

From the repository root:

```bash
# Check Rust compilation
cargo check --locked --manifest-path src-tauri/Cargo.toml

# Run Rust tests
cargo test --locked --manifest-path src-tauri/Cargo.toml

# Check Rust formatting
cargo fmt --all --manifest-path src-tauri/Cargo.toml -- --check

# Lint Rust code
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

These examples assume the Rust manifest lives at `src-tauri/Cargo.toml`.

## Cross-platform considerations

Local Wiki uses Rust's `Path` and `PathBuf` abstractions for platform-independent filesystem path handling. Filesystem behavior can still differ across operating systems, including case sensitivity, permissions, and symbolic links.

Cross-platform CI can verify compilation and automated tests on Windows, macOS, and Linux, but GUI behavior also needs testing on each target platform.

## Recommended IDE setup

- [Visual Studio Code](https://code.visualstudio.com/)
- [Tauri VS Code extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Project status

Local Wiki is under active development. Functionality and platform support may change.
