# Link Checker App

リンクチェッカーアプリケーション

## 開発環境のセットアップ

### 必要条件
- Node.js (v18以上)
- npm (v9以上)

### 開発用セットアップ手順

1. 依存関係のインストール
```bash
npm install
```

2. 開発サーバーの起動
```bash
npm run dev
```

別のターミナルで

```bash
npm run electron:dev
```


## ビルド方法

### プロダクションビルド
以下のコマンドでアプリケーションをビルドできます：

```bash
npm run build
npm run electron:build
```

このコマンドは以下の処理を実行します：
1. Viteによるフロントエンドのビルド
2. Electronアプリケーションのパッケージング

ビルドされたアプリケーションは `dist` ディレクトリに生成されます。

### アプリケーションの実行
ビルド後、以下のコマンドでアプリケーションを実行できます：

```bash
npm run preview
```

## プロジェクト構成
- `src/` - Reactアプリケーションのソースコード
- `electron/` - Electron関連のソースコード
- `public/` - 静的アセット