# Homebrew Cask でアプリを配布する方法

自分の tap リポジトリ（例: `tokuhirom/homebrew-tap`）を使って macOS アプリを Homebrew で配布する方法。

## 前提条件

- GitHub に `homebrew-tap` リポジトリを作成済み
- アプリは `.app` バンドルとして zip で配布
- arm64 と amd64 の両アーキテクチャをサポート

## 1. Cask ファイルの構造

```ruby
cask "appname" do
  arch arm: "arm64", intel: "amd64"

  version "1.0.0"
  sha256 arm: "ARM64のSHA256ハッシュ", intel: "AMD64のSHA256ハッシュ"

  url "https://github.com/USER/REPO/releases/download/v#{version}/AppName_v#{version}_darwin_#{arch}.zip"
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

      # arm64 ビルド
      - name: Build for macOS (arm64)
        run: wails build -platform darwin/arm64

      - name: Create zip (arm64)
        run: |
          cd build/bin
          zip -r AppName_${{ github.ref_name }}_darwin_arm64.zip AppName.app
          # amd64 ビルド前に退避（rm -rf build/bin で消えないように）
          mv AppName_${{ github.ref_name }}_darwin_arm64.zip /tmp/

      # amd64 ビルド
      - name: Build for macOS (amd64)
        run: |
          rm -rf build/bin
          wails build -platform darwin/amd64

      - name: Create zip (amd64)
        run: |
          cd build/bin
          zip -r AppName_${{ github.ref_name }}_darwin_amd64.zip AppName.app
          # arm64 の zip を戻す
          mv /tmp/AppName_${{ github.ref_name }}_darwin_arm64.zip .

      # チェックサム計算
      - name: Calculate checksums
        id: checksums
        run: |
          ARM64_SHA256=$(shasum -a 256 build/bin/AppName_${{ github.ref_name }}_darwin_arm64.zip | awk '{print $1}')
          AMD64_SHA256=$(shasum -a 256 build/bin/AppName_${{ github.ref_name }}_darwin_amd64.zip | awk '{print $1}')

          # バリデーション
          if [ -z "$ARM64_SHA256" ]; then
            echo "ERROR: Failed to calculate ARM64 checksum"
            exit 1
          fi
          if [ -z "$AMD64_SHA256" ]; then
            echo "ERROR: Failed to calculate AMD64 checksum"
            exit 1
          fi

          echo "arm64_sha256=$ARM64_SHA256" >> $GITHUB_OUTPUT
          echo "amd64_sha256=$AMD64_SHA256" >> $GITHUB_OUTPUT
          VERSION="${{ github.ref_name }}"
          echo "version=${VERSION#v}" >> $GITHUB_OUTPUT

      # GitHub Release にアップロード
      - name: Upload to Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            build/bin/AppName_${{ github.ref_name }}_darwin_arm64.zip
            build/bin/AppName_${{ github.ref_name }}_darwin_amd64.zip

      # Homebrew Cask を更新
      - name: Update Homebrew Cask
        env:
          TAP_GITHUB_TOKEN: ${{ secrets.TAP_GITHUB_TOKEN }}
          VERSION: ${{ steps.checksums.outputs.version }}
          ARM64_SHA256: ${{ steps.checksums.outputs.arm64_sha256 }}
          AMD64_SHA256: ${{ steps.checksums.outputs.amd64_sha256 }}
        run: |
          # バリデーション
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
            '  arch arm: "arm64", intel: "amd64"' \
            '' \
            "  version \"${VERSION}\"" \
            "  sha256 arm: \"${ARM64_SHA256}\", intel: \"${AMD64_SHA256}\"" \
            '' \
            '  url "https://github.com/USER/REPO/releases/download/v#{version}/AppName_v#{version}_darwin_#{arch}.zip"' \
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

### heredoc を使わない理由

GitHub Actions の YAML で heredoc を使うと、内容が YAML として解釈されてシンタックスエラーになる場合がある。`printf` を使うのが安全。

### arm64 zip の退避

arm64 ビルド後に amd64 をビルドする際、`rm -rf build/bin` で arm64 の zip も消えてしまう。一時的に `/tmp/` に退避してから戻す。

### 署名されていないアプリ

署名・notarize されていないアプリは macOS の Gatekeeper でブロックされる。`postflight` で `xattr -cr` を実行して quarantine 属性を削除する。ユーザーは sudo パスワードの入力が必要。

## 参考リンク

- [Homebrew Cask Cookbook](https://docs.brew.sh/Cask-Cookbook)
- [Wails Crossplatform Build](https://wails.io/docs/guides/crossplatform-build/)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
