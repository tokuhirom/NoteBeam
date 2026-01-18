# Changelog

## [v0.0.17](https://github.com/tokuhirom/NoteBeam/compare/v0.0.16...v0.0.17) - 2026-01-18
- feat: add optimistic locking to prevent data loss by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/48

## [v0.0.16](https://github.com/tokuhirom/NoteBeam/compare/v0.0.15...v0.0.16) - 2026-01-17
- feat: Cmd-T cycles TODO type when cursor is on TYPE by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/45

## [v0.0.15](https://github.com/tokuhirom/NoteBeam/compare/v0.0.14...v0.0.15) - 2026-01-17
- feat: use OS-specific application data directory by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/43

## [v0.0.14](https://github.com/tokuhirom/NoteBeam/compare/v0.0.13...v0.0.14) - 2026-01-17
- fix: place cursor on empty line after time header in Cmd-N by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/39
- feat: add backup strategy with .bak and daily backups by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/42
- fix: show error dialog when file loading fails by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/40

## [v0.0.13](https://github.com/tokuhirom/NoteBeam/compare/v0.0.12...v0.0.13) - 2026-01-17
- docs: add homebrew cask setup guide by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/36
- feat: switch to universal build for simpler distribution by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/38

## [v0.0.12](https://github.com/tokuhirom/NoteBeam/compare/v0.0.11...v0.0.12) - 2026-01-17
- feat: add custom app icon for NoteBeam by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/34

## [v0.0.11](https://github.com/tokuhirom/NoteBeam/compare/v0.0.10...v0.0.11) - 2026-01-17
- feat: add postflight to remove quarantine attribute by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/32

## [v0.0.10](https://github.com/tokuhirom/NoteBeam/compare/v0.0.9...v0.0.10) - 2026-01-17
- fix: preserve arm64 zip during amd64 build by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/30

## [v0.0.9](https://github.com/tokuhirom/NoteBeam/compare/v0.0.8...v0.0.9) - 2026-01-17
- ci: add actionlint to CI workflow by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/28

## [v0.0.8](https://github.com/tokuhirom/NoteBeam/compare/v0.0.7...v0.0.8) - 2026-01-17
- fix: improve Cmd-N cursor position by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/25
- fix: use printf instead of heredoc in release workflow by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/27

## [v0.0.7](https://github.com/tokuhirom/NoteBeam/compare/v0.0.6...v0.0.7) - 2026-01-17
- fix: validate checksums and env vars before updating Cask by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/23

## [v0.0.6](https://github.com/tokuhirom/NoteBeam/compare/v0.0.5...v0.0.6) - 2026-01-17
- chore: bump version to 0.0.6 by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/21

## [v0.0.5](https://github.com/tokuhirom/NoteBeam/compare/v0.0.4...v0.0.5) - 2026-01-17
- feat: Add Homebrew Cask support by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/19

## [v0.0.4](https://github.com/tokuhirom/NoteBeam/compare/v0.0.3...v0.0.4) - 2026-01-17
- feat: Add deadline priority and type change keybindings by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/16
- Add space after colon in insertTodo by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/17

## [v0.0.3](https://github.com/tokuhirom/NoteBeam/compare/v0.0.2...v0.0.3) - 2026-01-17
- READMEにReleasesからのインストール手順を追加 by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/11
- Add release workflow for macOS binaries by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/14
- feat: Change TODO syntax from howm to neojot style by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/15

## [v0.0.3](https://github.com/tokuhirom/NoteBeam/compare/v0.0.2...v0.0.3) - 2026-01-17
- READMEにReleasesからのインストール手順を追加 by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/11

## [v0.0.2](https://github.com/tokuhirom/NoteBeam/compare/v0.0.1...v0.0.2) - 2026-01-16
- Add date picker for TODO date editing by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/9

## [v0.0.1](https://github.com/tokuhirom/NoteBeam/commits/v0.0.1) - 2026-01-16
- Add howm-style TODO management with undo/redo support by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/4
- Bump golang.org/x/crypto from 0.33.0 to 0.45.0 by @dependabot[bot] in https://github.com/tokuhirom/NoteBeam/pull/1
- Bump vite from 5.4.21 to 7.3.1 in /frontend by @dependabot[bot] in https://github.com/tokuhirom/NoteBeam/pull/5
- Fix Cmd-N to scroll cursor into view by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/6
- Add CI and tagpr workflows by @tokuhirom in https://github.com/tokuhirom/NoteBeam/pull/7
