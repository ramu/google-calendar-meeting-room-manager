# Google Calendar 会議室管理システム

Google Calendar API v3 を利用した会議室管理 Web サービスです。

## 🏗️ プロジェクト構成

```
google-calendar-meeting-room-manager/
├── frontend/          # React + TypeScript + Vite フロントエンド
├── backend/           # Node.js + Express + TypeScript バックエンド
├── shared/            # 共通型定義
└── docs/              # Google Calendar API ドキュメント
```

## ✨ 主要機能

- **会議室管理**: Google Calendar ベースの会議室作成・編集・削除
- **予約管理**: 重複チェック機能付き予約作成・編集・削除
- **空き時間検索**: リアルタイム空き時間表示
- **カレンダービュー**: 月/週/日表示での予約確認
- **Google OAuth認証**: セキュアな認証システム
- **繰り返し予約**: 定期的な会議の設定

## 🔧 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router DOM
- React Hook Form

### バックエンド
- Node.js
- Express
- TypeScript
- Google APIs (googleapis)
- JWT認証
- Winston (ログ)
- Express Validator

## 📋 事前準備

### 1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. Calendar API を有効化
   - 「APIとサービス」→「ライブラリ」
   - 「Google Calendar API」を検索して有効化
4. OAuth 2.0 認証情報を作成
   - 「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類: 「ウェブアプリケーション」
   - 承認済みのリダイレクト URI: `http://localhost:5005/api/auth/google/callback`
   - 承認済みの JavaScript 生成元: `http://localhost:3000`

### 2. 必要なソフトウェア

- Node.js (v18 以上)
- npm または yarn

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd google-calendar-meeting-room-manager
```

### 2. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp env.example .env

# .env ファイルを編集（後述の環境変数設定を参照）
```

#### 環境変数設定 (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URL=http://localhost:5005/api/auth/google/callback

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**重要**: `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` は Google Cloud Console で作成した認証情報を設定してください。

### 3. フロントエンドのセットアップ

```bash
cd frontend

# 依存関係のインストール
npm install
```

## 🏃‍♂️ 起動方法

### 開発環境での起動

#### 1. バックエンドの起動

```bash
cd backend
npm run dev
```

サーバーは http://localhost:5005 で起動します。

#### 2. フロントエンドの起動（別ターミナル）

```bash
cd frontend
npm run dev
```

フロントエンドは http://localhost:3000 で起動します。

### 本番環境での起動

#### バックエンド

```bash
cd backend
npm run build
npm start
```

#### フロントエンド

```bash
cd frontend
npm run build
npm run preview
```

## 🧪 開発コマンド

### バックエンド

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# TypeScript型チェック
npm run typecheck

# ESLint実行
npm run lint

# ビルド
npm run build

# 本番起動
npm start
```

### フロントエンド

```bash
# 開発サーバー起動
npm run dev

# TypeScript型チェック
npm run typecheck

# ESLint実行
npm run lint

# ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## 📖 API ドキュメント

詳細なAPI仕様は `docs/` フォルダ内のドキュメントを参照してください：

- [`api-reference.md`](./docs/api-reference.md) - Google Calendar API 機能一覧
- [`events-resource.md`](./docs/events-resource.md) - Events リソース詳細
- [`calendars-resource.md`](./docs/calendars-resource.md) - Calendars リソース詳細
- [`implementation-guide.md`](./docs/implementation-guide.md) - 実装ガイド

## 🔒 認証フロー

1. ユーザーが「Google でログイン」ボタンをクリック
2. Google OAuth認証画面へリダイレクト
3. ユーザーが認証を許可
4. バックエンドでアクセストークンを取得
5. JWTトークンを生成してフロントエンドに返却
6. 以降のAPIリクエストでJWTトークンを使用

## 🏢 会議室管理の仕組み

1. **会議室作成**: Google Calendar で新しいカレンダーを作成
2. **予約作成**: 該当カレンダーにイベントを作成
3. **空き時間検索**: Google Calendar の FreeBusy API を利用
4. **重複チェック**: 既存イベントとの時間重複を検証

## 🛠️ トラブルシューティング

### よくある問題

#### 1. Google OAuth エラー

**エラー**: `redirect_uri_mismatch`

**解決方法**: Google Cloud Console で設定したリダイレクトURIと、環境変数の `GOOGLE_REDIRECT_URL` が一致していることを確認

#### 2. CORS エラー

**エラー**: フロントエンドからバックエンドへのアクセスが拒否される

**解決方法**: バックエンドの `.env` ファイルで `CORS_ORIGIN` が正しく設定されていることを確認

#### 3. JWT エラー

**エラー**: `JsonWebTokenError: invalid token`

**解決方法**: ブラウザのローカルストレージをクリアして再ログイン

### ログの確認

バックエンドのログは以下のファイルに出力されます：
- `error.log` - エラーログ
- `combined.log` - 全ログ
