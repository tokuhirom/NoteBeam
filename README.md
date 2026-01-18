# NoteBeam

NoteBeam はお手軽に使えるメモアプリです。macOS、Windows、Linux に対応しています。

基本的には1ファイルだけのメモアプリ。フォーマットは以下のような形。

データは OS 標準のアプリケーションデータディレクトリに保存されます:

| OS | パス |
|----|------|
| macOS | `~/Library/Application Support/NoteBeam/index.md` |
| Windows | `%AppData%\NoteBeam\index.md` |
| Linux | `~/.local/share/NoteBeam/index.md` (XDG_DATA_HOME)

```markdown
# 2026-01-16 (Fri)

## 23:01

開発開始

# 2026-01-15 (Thu)

## 23:59

寝ます
```

## Features

- **Cmd/Ctrl-N**: 新しいエントリを追加。今日の日付がなければ先頭に日付ヘッダーを追加、あれば今日のセクションに時刻エントリを追加
- **Cmd/Ctrl-F**: 検索機能
- **Cmd/Ctrl-T**: TODO を挿入
- **Cmd/Ctrl-Shift-T**: TODO ペインの表示/非表示
- **自動保存**: 1秒ごとに自動保存
- **シンタックスハイライト**: Markdown の見出し、コードブロック内の各言語をハイライト表示
- **画像ペースト**: Cmd/Ctrl-V で画像をペーストすると `images/YYYYMMDDHHMMSS.png` に保存され、インラインプレビュー表示

**ショートカットキーについて**: macOS では Cmd、Windows/Linux では Ctrl を使用します。

## Installation

### macOS

#### Homebrew でインストール（推奨）

```bash
brew install tokuhirom/tap/notebeam
```

**注意**: このアプリは署名されていないため、初回起動前に以下のコマンドを実行してください:
```bash
xattr -cr /Applications/NoteBeam.app
```

#### Releases からインストール

1. [Releases ページ](https://github.com/tokuhirom/NoteBeam/releases)から `NoteBeam_*_darwin_universal.zip` をダウンロード
2. ダウンロードした zip ファイルを解凍
3. `NoteBeam.app` をアプリケーションフォルダにドラッグ&ドロップ

**注意**: このアプリは署名されていないため、以下のいずれかの方法で起動してください。

**方法1: xattr コマンドを使用（推奨）**

ターミナルで以下のコマンドを実行:
```bash
xattr -cr /Applications/NoteBeam.app
```

その後、通常通りアプリを起動できます。

**方法2: 右クリックから起動**

- アプリを右クリック（または Control + クリック）して「開く」を選択
- 表示されるダイアログで「開く」をクリック
- または、システム設定 > プライバシーとセキュリティ から「このまま開く」を選択

### Windows

1. [Releases ページ](https://github.com/tokuhirom/NoteBeam/releases)から `NoteBeam_*_windows_amd64.zip` をダウンロード
2. ダウンロードした zip ファイルを解凍
3. `NoteBeam.exe` を実行

### Linux

1. [Releases ページ](https://github.com/tokuhirom/NoteBeam/releases)から `NoteBeam_*_linux_amd64.tar.gz` をダウンロード
2. ダウンロードしたファイルを解凍:
```bash
tar -xzf NoteBeam_*_linux_amd64.tar.gz
```
3. `NoteBeam` を実行:
```bash
./NoteBeam
```

オプションで `/usr/local/bin` などにコピーして使用することもできます:
```bash
sudo cp NoteBeam /usr/local/bin/
```

## TODO 管理（neojot 方式）

[neojot](https://github.com/tokuhirom/neojot) にインスパイアされたキーワードベースの TODO 管理機能。[howm](https://kaorahi.github.io/howm/) の浮沈式優先度計算を採用しています。

### 記法

```markdown
TODO[Scheduled:2026-01-17]:牛乳を買う
TODO[Deadline:2026-01-17]:レポート提出
DOING[Scheduled:2026-01-17]:開発作業
DONE[Finished:2026-01-17][Scheduled:2026-01-15]:完了したタスク
NOTE[Scheduled:2026-01-17]:会議メモ
PLAN[Scheduled:2026-01-17]:週次レビュー
CANCELED[Scheduled:2026-01-17]:キャンセルしたタスク
```

### TYPE一覧

| TYPE | 説明 | 色 |
|------|------|-----|
| TODO | 通常のタスク | 黄色 |
| DOING | 作業中（常に最上位に表示） | オレンジ |
| DONE | 完了 | 緑 |
| CANCELED | キャンセル | グレー |
| PLAN | 計画/繰延（周期的に浮沈） | 青 |
| NOTE | メモ/覚書（日が経つと沈む） | マゼンタ |

### パラメータ

| パラメータ | 説明 |
|------------|------|
| `Scheduled:YYYY-MM-DD` | 予定日 |
| `Deadline:YYYY-MM-DD` | 期限（近づくと優先度上昇） |
| `Finished:YYYY-MM-DD` | 完了日 |

### 操作

| キー | 動作 |
|------|------|
| **Cmd/Ctrl-T** | TODO を挿入、または TYPE 上ならサイクル: `TODO` → `DOING` → `DONE` |
| **Enter** | 日付上で押すとカレンダーピッカーを表示 |
| **`.`** | TYPE上で押すと完了（DONE）に変換 |
| **`c`** | TYPE上で押すと CANCELED に変換 |
| **`n`** | TYPE上で押すと NOTE に変換 |
| **`p`** | TYPE上で押すと PLAN に変換 |
| **Cmd/Ctrl-Shift-T** | TODO ペインを表示/非表示 |

### 日付変更（カレンダーピッカー）

日付部分（`Scheduled:2026-01-17` や `Deadline:2026-01-17` の日付）でEnterを押すとカレンダーが表示されます。

| キー | 動作 |
|------|------|
| **h / ←** | 1日前 |
| **l / →** | 1日後 |
| **k / ↑** | 1週間前 |
| **j / ↓** | 1週間後 |
| **Enter** | 選択した日付で確定 |
| **t** | 今日を選択 |
| **Escape** | キャンセル |

### 完了

TYPE（TODO, DOING, PLAN, NOTE）の上で `.` を押すと完了状態に変換され、完了日時が記録されます。

```markdown
# 完了前
TODO[Scheduled:2026-01-17]:牛乳を買う

# 完了後（. を押す）
DONE[Finished:2026-01-17][Scheduled:2026-01-17]:牛乳を買う
```

完了した TODO（DONE, CANCELED）は TODO ペインから消えます。

### 浮沈式とは

時間の経過で TODO の優先度が自動的に変化する仕組みです。

| TYPE | 挙動 |
|------|------|
| DOING | 常に最上位に表示 |
| TODO | 期日後、日が経つほど浮上（放置すると目立つ） |
| NOTE | 期日後、日が経つと沈む（忘れていい） |
| PLAN | 7日周期で浮沈を繰り返す |

## Motivation

なんかふと作りたくなったので。

LogSeq わりと良かったんだけど、なんかこう。。Outliner じゃなくて良いなって気分になったんですよね。

## Architecture

Wails + Preact + TypeScript + CodeMirror 6

## Development

```bash
# 開発モード
wails dev

# ビルド
wails build
```

## LICENSE

MIT
