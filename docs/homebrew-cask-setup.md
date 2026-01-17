# Homebrew Cask でアプリを配布する方法

自分の tap リポジトリ（例: `tokuhirom/homebrew-tap`）を使って macOS アプリを Homebrew で配布する方法。

## 前提条件

- GitHub に `homebrew-tap` リポジトリを作成済み
- アプリは `.app` バンドルとして zip で配布
- universal binary（arm64 + amd64）でビルド

## 1. Cask ファイルの構造

```ruby
cask "appname" do
  version "1.0.0"
  sha256 "SHA256ハッシュ"

  url "https://github.com/USER/REPO/releases/download/v#{version}/AppName_v#{version}_darwin_universal.zip"
  name "AppName"
  desc "アプリの説明"
  homepage "https://github.com/USER/REPO"

  app "AppName.app"

  # 署名されていないアプリの quarantine 属性を削除
  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/AppName.app"],
                   sudo: true
  end

  # アンインストール時に削除するファイル
  zap trash: "~/Documents/AppName"
end
```

## 2. GitHub Actions でリリース時に自動更新

### 必要な secrets

- `TAP_GITHUB_TOKEN`: homebrew-tap リポジトリへの書き込み権限を持つ Personal Access Token

### release.yml の例

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install Wails
        run: go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Install frontend dependencies
        run: npm ci
        working-directory: frontend

      - name: Build for macOS (universal)
        run: wails build -platform darwin/universal

      - name: Create zip
        run: |
          cd build/bin
          zip -r AppName_${{ github.ref_name }}_darwin_universal.zip AppName.app

      - name: Calculate checksum
        id: checksum
        run: |
          SHA256=$(shasum -a 256 build/bin/AppName_${{ github.ref_name }}_darwin_universal.zip | awk '{print $1}')

          if [ -z "$SHA256" ]; then
            echo "ERROR: Failed to calculate checksum"
            exit 1
          fi

          echo "sha256=$SHA256" >> $GITHUB_OUTPUT
          VERSION="${{ github.ref_name }}"
          echo "version=${VERSION#v}" >> $GITHUB_OUTPUT

      - name: Upload to Release
        uses: softprops/action-gh-release@v2
        with:
          files: build/bin/AppName_${{ github.ref_name }}_darwin_universal.zip

      - name: Update Homebrew Cask
        env:
          TAP_GITHUB_TOKEN: ${{ secrets.TAP_GITHUB_TOKEN }}
          VERSION: ${{ steps.checksum.outputs.version }}
          SHA256: ${{ steps.checksum.outputs.sha256 }}
        run: |
          if [ -z "$TAP_GITHUB_TOKEN" ]; then
            echo "ERROR: TAP_GITHUB_TOKEN is not set"
            exit 1
          fi

          git clone https://x-access-token:${TAP_GITHUB_TOKEN}@github.com/USER/homebrew-tap.git
          cd homebrew-tap

          mkdir -p Casks
          # printf を使用（heredoc は YAML 構文エラーになる可能性あり）
          printf '%s\n' \
            'cask "appname" do' \
            "  version \"${VERSION}\"" \
            "  sha256 \"${SHA256}\"" \
            '' \
            '  url "https://github.com/USER/REPO/releases/download/v#{version}/AppName_v#{version}_darwin_universal.zip"' \
            '  name "AppName"' \
            '  desc "アプリの説明"' \
            '  homepage "https://github.com/USER/REPO"' \
            '' \
            '  app "AppName.app"' \
            '' \
            '  postflight do' \
            '    system_command "/usr/bin/xattr",' \
            '                   args: ["-cr", "#{appdir}/AppName.app"],' \
            '                   sudo: true' \
            '  end' \
            '' \
            '  zap trash: "~/Documents/AppName"' \
            'end' > Casks/appname.rb

          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add Casks/appname.rb
          git commit -m "Update AppName to ${VERSION}" || echo "No changes to commit"
          git push
```

## 3. ユーザーのインストール方法

```bash
brew install USER/tap/appname
```

## 注意事項

### universal binary を使う理由

`wails build -platform darwin/universal` で arm64 と amd64 の両方に対応した universal binary を作成できる。1つの zip で両アーキテクチャに対応でき、Cask もシンプルになる。

### heredoc を使わない理由

GitHub Actions の YAML で heredoc を使うと、内容が YAML として解釈されてシンタックスエラーになる場合がある。`printf` を使うのが安全。

### 署名されていないアプリ

署名・notarize されていないアプリは macOS の Gatekeeper でブロックされる。`postflight` で `xattr -cr` を実行して quarantine 属性を削除する。ユーザーは sudo パスワードの入力が必要。

## 参考リンク

- [Homebrew Cask Cookbook](https://docs.brew.sh/Cask-Cookbook)
- [Wails Crossplatform Build](https://wails.io/docs/guides/crossplatform-build/)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
