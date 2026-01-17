# バックアップ機能

NoteBeam はデータ損失を防ぐため、自動バックアップ機能を備えています。

## バックアップの種類

### 1. 即時バックアップ（.bak）

保存のたびに `index.md.bak` を作成します。これは直前の状態を保持しており、誤って内容を消してしまった場合などに即座に復旧できます。

### 2. 日次バックアップ

1日1回（その日の最初の保存時）、`backups/` ディレクトリに日付付きのバックアップを作成します。過去7日分が保持され、それより古いものは自動的に削除されます。

## ディレクトリ構造

データは OS 標準のアプリケーションデータディレクトリに保存されます:

| OS | ディレクトリ |
|----|------------|
| macOS | `~/Library/Application Support/NoteBeam/` |
| Windows | `%AppData%\NoteBeam\` |
| Linux | `~/.local/share/NoteBeam/` (XDG_DATA_HOME) |

```
<data-dir>/NoteBeam/
├── index.md              # メインファイル
├── index.md.bak          # 直前の状態（毎回更新）
├── images/               # 画像ファイル
└── backups/
    ├── index.2026-01-18.md
    ├── index.2026-01-17.md
    ├── index.2026-01-16.md
    └── ...               # 7日分保持
```

## 復旧方法

### 直前の状態に戻す

```bash
# macOS の場合
cd ~/Library/Application\ Support/NoteBeam
cp index.md.bak index.md
```

### 特定の日の状態に戻す

```bash
# macOS の場合
cd ~/Library/Application\ Support/NoteBeam
cp backups/index.2026-01-17.md index.md
```

## 設定

現在、バックアップの保持期間（デフォルト7日）はコード内で定義されています。

```go
const backupRetentionDays = 7
```

## 注意事項

- バックアップはアプリが保存を行うタイミングで作成されます（1秒ごとの自動保存時）
- `.bak` ファイルは保存のたびに上書きされるため、1世代分のみ保持されます
- 日次バックアップはその日の最初の保存時に作成されます
- バックアップの作成に失敗しても、本体の保存は継続されます
