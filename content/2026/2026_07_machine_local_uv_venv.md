Title: Keeping uv Virtual Environments Out of Google Drive
Author: Seppe "Macuyiko" vanden Broucke
Date: 2026-07-17 18:41
Status: published

I have a nasty habbit of starting quick new Python projects somewhere in my chronologically organized Google Drive, `uv init`-ing them, and start adding packages.

By default, this means every project gets a `.venv` directory alongside its `pyproject.toml`. That works perfectly on a single machine. It also works as intended if you sync your projects with e.g. GitHub as those local `.venv` folders are just ignored. It's less pleasant when the project directory lives in Google Drive, Dropbox, OneDrive, pCloud, or another synchronized folder and you switch between machines often. A Python virtual environment contains thousands of small files, compiled binaries, interpreter-specific paths, and platform-specific packages. Synchronizing it creates two problems. First, the sync client spends a disproportionate amount of time processing `.venv` (and a lot of sync engines hate a lot of small files). Second, a virtual environment created on Windows will not work correctly on macOS or Linux, which also causes `uv run` complaints.

The solution would be to stop putting project folders in Google Drive and just use Git. But I'm stubborn and don't want to start a new repo for any small experiment or idea that more often than not turns out to go nowhere.

So my ideal setup is therefore:

- Google Drive:
    - project/
        - pyproject.toml
        - uv.lock
        - .python-version
        - src/
        - README.MD
        - ...
- Local machine (somewhere and somehow):
    - uv-project-envs/
        - project-a1b2c3d4e5f6/

At the same time, I still want to type: `uv run python main.py`, `uv sync` or `uv add pandas` (or more often: want AI agents to run this if they want to without issue). I do not want to remember `--active` or teach every coding agent to use a custom command or flag. It should also work on all platforms and not rely on [symlink hocus pocus](https://github.com/c0rychu/uvlink).

And thus, the solution is to put a small wrapper named `uv` earlier in the system PATH. This wrapper should find the current project root, create a short hash from the project’s absolute path, set `UV_PROJECT_ENVIRONMENT` to a machine-local directory and then call the real `uv` executable (which picks up `UV_PROJECT_ENVIRONMENT`). Renaming or moving the project creates a new local environment, but that's ok and even desirable.

## Setup

Make sure each project includes a Python version pin: e.g. `uv python pin 3.12`, i.e. that you have a `.python-version`. Normally this is already the case for `uv` projects. Also, it's a good idea to still add `.venv` to `.gitignore` even though the wrapper will no longer create it.

### macOS and Linux

1. Locate the real uv executable using `command -v uv` (I'll use `/Users/seppe/.local/bin/uv`)
2. `mkdir -p "$HOME/bin` or another directory where we will make the wrapper
3. `nano "$HOME/bin/uv"` and paste the script below
4. `chmod +x "$HOME/bin/uv"`
5. Put the wrapper first in PATH
    - For macOS using zsh, add this to `~/.zprofile`: `export PATH="$HOME/bin:$PATH"`
    - For Linux, add it to `~/.profile`: `export PATH="$HOME/bin:$PATH"`
    - Depending on how the Linux terminal starts Bash, it may also be useful to add the same line to `~/.bashrc`
    - `source ~/.zprofile` or `source ~/.profile` or open a new Terminal
6. `type -a uv` to verify the wrapper appears first `uv --version` to make sure `uv` works

Script `$HOME/bin/uv`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# === IMPORTANT =========================================
# Replace this with the result of:
# command -v uv
REAL_UV="/absolute/path/to/the/real/uv"

if [[ ! -x "$REAL_UV" ]]; then
    echo "uv wrapper: real uv executable not found at:" >&2
    echo "  $REAL_UV" >&2
    echo "Update REAL_UV in $0." >&2
    exit 1
fi

find_project_root() {
    local dir="$PWD"
    local candidate=""

    while true; do
        # A lockfile is the strongest indication of the actual uv root.
        # This also behaves more sensibly for uv workspaces.
        if [[ -f "$dir/uv.lock" ]]; then
            printf '%s\n' "$dir"
            return
        fi

        # Remember the nearest project marker in case there is no lockfile yet.
        if [[ -z "$candidate" ]] && {
            [[ -f "$dir/pyproject.toml" ]] ||
            [[ -f "$dir/uv.toml" ]] ||
            [[ -f "$dir/.python-version" ]];
        }; then
            candidate="$dir"
        fi

        if [[ "$dir" == "/" ]]; then
            break
        fi

        dir="$(dirname "$dir")"
    done

    printf '%s\n' "$candidate"
}

project_root="$(find_project_root)"

# Outside a Python project, behave exactly like the real uv command.
if [[ -z "$project_root" ]]; then
    exec "$REAL_UV" "$@"
fi

# macOS normally provides shasum; Linux normally provides sha256sum.
if command -v sha256sum >/dev/null 2>&1; then
    project_hash="$(
        printf '%s' "$project_root" |
        sha256sum |
        cut -c1-12
    )"
elif command -v shasum >/dev/null 2>&1; then
    project_hash="$(
        printf '%s' "$project_root" |
        shasum -a 256 |
        cut -c1-12
    )"
else
    echo "uv wrapper: sha256sum or shasum is required." >&2
    exit 1
fi

project_name="$(
    basename "$project_root" |
    tr -cd '[:alnum:]_.-'
)"

if [[ -z "$project_name" ]]; then
    project_name="project"
fi

env_root="${
    UV_LOCAL_ENV_ROOT:-${
        XDG_DATA_HOME:-$HOME/.local/share
    }/uv-project-envs
}"

mkdir -p "$env_root"
export UV_PROJECT_ENVIRONMENT="$env_root/${project_name}-${project_hash}"
exec "$REAL_UV" "$@"
```

### Windows

On Windows, the most compatible solution is a small `uv.cmd` launcher combined with a PowerShell script. Using a .cmd launcher means the wrapper can be found by: PowerShell, Command Prompt, VS Code terminals, etc.

1. Locate the real uv executable using `(Get-Command uv.exe).Source` (I'll use `C:\Users\Seppe\.local\bin\uv.exe`)
2. `New-Item -ItemType Directory -Force "$env:USERPROFILE\bin"` or another directory where we will make the wrapper
3. `notepad "$env:USERPROFILE\bin\uv-wrapper.ps1"` and paste the script below
4. `notepad "$env:USERPROFILE\bin\uv.cmd"` and paste the second script below
5. Put the wrapper first in PATH
    - "Edit environment variables for your account"
    - Add `%USERPROFILE%\bin` and make sure it is above the uv path
    - Close all open terminals
6. `Get-Command uv -All` to verify the wrapper appears first `uv --version` to make sure `uv` works

Script `$env:USERPROFILE\bin\uv-wrapper.ps1`:

```powershell
$ErrorActionPreference = "Stop"

# === IMPORTANT =========================================
# Replace this with the result of:
# (Get-Command uv.exe).Source
$RealUv = "C:\absolute\path\to\the\real\uv.exe"

if (-not (Test-Path -LiteralPath $RealUv -PathType Leaf)) {
    Write-Error "uv wrapper: real uv executable not found at: $RealUv"
    exit 1
}

function Find-UvProjectRoot {
    $dir = (Get-Location).ProviderPath
    $candidate = $null

    while ($true) {
        $lockfile = Join-Path $dir "uv.lock"

        # Prefer the nearest uv.lock. This is also more suitable
        # for projects contained in a uv workspace.
        if (Test-Path -LiteralPath $lockfile -PathType Leaf) {
            return $dir
        }

        $hasProjectMarker = (
            (Test-Path -LiteralPath (Join-Path $dir "pyproject.toml") -PathType Leaf) -or
            (Test-Path -LiteralPath (Join-Path $dir "uv.toml") -PathType Leaf) -or
            (Test-Path -LiteralPath (Join-Path $dir ".python-version") -PathType Leaf)
        )

        if ($null -eq $candidate -and $hasProjectMarker) {
            $candidate = $dir
        }

        $parent = Split-Path -Path $dir -Parent

        if (
            [string]::IsNullOrEmpty($parent) -or
            $parent -eq $dir
        ) {
            break
        }

        $dir = $parent
    }

    return $candidate
}

$projectRoot = Find-UvProjectRoot

# Outside a project, call the real uv normally.
if ([string]::IsNullOrWhiteSpace($projectRoot)) {
    & $RealUv @args
    exit $LASTEXITCODE
}

# Windows paths are case-insensitive, so normalize the path before hashing.
$normalizedRoot = (
    [System.IO.Path]::GetFullPath($projectRoot)
        .TrimEnd('\')
        .ToLowerInvariant()
)

$bytes = [System.Text.Encoding]::UTF8.GetBytes($normalizedRoot)
$sha = [System.Security.Cryptography.SHA256]::Create()

try {
    $hashBytes = $sha.ComputeHash($bytes)
}
finally {
    $sha.Dispose()
}

$projectHash = (
    $hashBytes |
    ForEach-Object { $_.ToString("x2") }
) -join ""

$projectHash = $projectHash.Substring(0, 12)

$projectName = Split-Path -Path $projectRoot -Leaf
$projectName = $projectName -replace '[^A-Za-z0-9_.-]', ''

if ([string]::IsNullOrWhiteSpace($projectName)) {
    $projectName = "project"
}

if ([string]::IsNullOrWhiteSpace($env:UV_LOCAL_ENV_ROOT)) {
    $envRoot = Join-Path $env:LOCALAPPDATA "uv-project-envs"
}
else {
    $envRoot = $env:UV_LOCAL_ENV_ROOT
}

New-Item -ItemType Directory -Force -Path $envRoot |
    Out-Null

$projectEnvironment = Join-Path `
    $envRoot `
    "$projectName-$projectHash"

$previousProjectEnvironment = $env:UV_PROJECT_ENVIRONMENT
$exitCode = 1

try {
    $env:UV_PROJECT_ENVIRONMENT = $projectEnvironment

    & $RealUv @args
    $exitCode = $LASTEXITCODE
}
finally {
    if ($null -eq $previousProjectEnvironment) {
        Remove-Item `
            Env:\UV_PROJECT_ENVIRONMENT `
            -ErrorAction SilentlyContinue
    }
    else {
        $env:UV_PROJECT_ENVIRONMENT = $previousProjectEnvironment
    }
}

exit $exitCode
```

Script `$env:USERPROFILE\bin\uv.cmd`:

```cmd
@echo off
REM You can also use pwsh.exe if PowerShell 7 is installed / preferred
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0uv-wrapper.ps1" %*
exit /b %ERRORLEVEL%
```

## Notes

- The main reason for naming the wrapper uv, rather than something like uvw, is compatibility with automated tools
- Important caveat: `uv pip`. `UV_PROJECT_ENVIRONMENT` applies to uv’s project workflow, but it does not affect the low-level `uv pip` interface. When this usage is required, explicitly activate the environment first
- Uninstall: simply remove from path, delete wrapper scripts and clean up `uv-project-envs` folder
