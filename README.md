# NoteBeam

NoteBeam はお手軽に使えるメモアプリです。Mac 用です。

基本的には1ファイルだけのメモアプリ。フォーマットは以下のような形。

デフォルトでは `~/Documents/NoteBeam/index.md` に保存されます。

```markdown
# 2026-01-16 (Fri)

## 23:01

開発開始

# 2026-01-15 (Thu)

## 23:59

寝ます
```

## Features

- **Cmd-N**: 新しいエントリを追加。今日の日付がなければ先頭に日付ヘッダーを追加、あれば今日のセクションに時刻エントリを追加
- **Cmd-F**: 検索機能
- **自動保存**: 1秒ごとに自動保存
- **シンタックスハイライト**: Markdown の見出し、コードブロック内の各言語をハイライト表示
- **画像ペースト**: Cmd-V で画像をペーストすると `images/YYYYMMDDHHMMSS.png` に保存され、インラインプレビュー表示

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
