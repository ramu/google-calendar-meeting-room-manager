# Calendars リソース詳細仕様

## 概要
Calendars リソースは個別のカレンダーのメタデータを表現します。会議室管理システムでは、各会議室を個別のカレンダーとして管理することが一般的です。

## 参考ドキュメント
- [Calendars | Google Calendar API](https://developers.google.com/workspace/calendar/api/v3/reference/calendars)
- [Calendar API Resource Types](https://developers.google.com/workspace/calendar/api/resource_types)
- [Domain resources, rooms & calendars](https://developers.google.com/workspace/calendar/api/concepts/domain)

## Calendars リソースのプロパティ

### 基本プロパティ
- `kind`: string - リソースタイプ（常に "calendar#calendar"）
- `etag`: string - リソースの ETag
- `id`: string - カレンダーの一意識別子
- `summary`: string - カレンダーのタイトル（**編集可能**）

### オプションプロパティ
- `description`: string - カレンダーの詳細説明（**編集可能**）
- `location`: string - 地理的位置情報（**編集可能**）
- `timeZone`: string - IANA タイムゾーン（**編集可能**）
- `conferenceProperties`: object - 会議ソリューションの設定（**編集可能**）

### 編集可能プロパティの詳細
編集可能（writable）なプロパティは `insert`、`patch`、`update` 操作で変更できます：
- `summary`: 必須（insert時）
- `description`: オプション
- `location`: オプション
- `timeZone`: オプション（例: "Asia/Tokyo", "Europe/London"）
- `conferenceProperties`: オプション

### Conference Properties
```json
{
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": [
      "eventHangout",
      "eventNamedHangout", 
      "hangoutsMeet"
    ]
  }
}
```

#### 利用可能な Conference Solution Types
- `"eventHangout"`: Google Hangouts
- `"eventNamedHangout"`: 名前付き Google Hangouts
- `"hangoutsMeet"`: Google Meet

## 利用可能な操作

### 1. clear
- **機能**: プライマリカレンダーの全イベント削除
- **HTTPメソッド**: POST
- **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/clear`
- **パラメータ**: 
  - `calendarId` (path, required): カレンダー識別子（"primary" 使用可能）
- **リクエストボディ**: なし
- **レスポンス**: 空のレスポンスボディ（成功時）
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.calendars`
- **注意**: セカンダリカレンダーには使用不可

### 2. delete
- **機能**: セカンダリカレンダーの削除
- **HTTPメソッド**: DELETE
- **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}`
- **パラメータ**: 
  - `calendarId` (path, required): カレンダー識別子
- **リクエストボディ**: なし
- **レスポンス**: 空のレスポンスボディ（成功時）
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.app.created`
  - `https://www.googleapis.com/auth/calendar.calendars`
- **注意**: プライマリカレンダーには使用不可

### 3. get
- **機能**: カレンダーメタデータの取得
- **HTTPメソッド**: GET
- **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}`
- **パラメータ**: 
  - `calendarId` (path, required): カレンダー識別子（"primary" 使用可能）
- **リクエストボディ**: なし
- **レスポンス**: Calendar リソース
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar`
  - その他カレンダー関連スコープ

### 4. insert
- **機能**: セカンダリカレンダーの作成
- **HTTPメソッド**: POST
- **URL**: `https://www.googleapis.com/calendar/v3/calendars`
- **パラメータ**: なし
- **リクエストボディ**: Calendar リソース（`summary` は必須）
- **レスポンス**: 作成された Calendar リソース
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.app.created`
  - `https://www.googleapis.com/auth/calendar.calendars`

### 5. patch
- **機能**: カレンダーメタデータの部分更新
- **HTTPメソッド**: PATCH
- **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}`
- **パラメータ**: 
  - `calendarId` (path, required): カレンダー識別子（"primary" 使用可能）
- **リクエストボディ**: Calendar リソース（部分）
- **レスポンス**: 更新された Calendar リソース
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.app.created`
  - `https://www.googleapis.com/auth/calendar.calendars`
- **クォータ消費**: 3単位
- **特記事項**: 
  - 指定されたフィールドのみ更新
  - 配列フィールドは完全置換
  - 効率性のため `get` → `update` を推奨

### 6. update
- **機能**: カレンダーメタデータの完全更新
- **HTTPメソッド**: PUT
- **URL**: `https://www.googleapis.com/calendar/v3/calendars/{calendarId}`
- **パラメータ**: 
  - `calendarId` (path, required): カレンダー識別子（"primary" 使用可能）
- **リクエストボディ**: Calendar リソース（完全）
- **レスポンス**: 更新された Calendar リソース
- **OAuth スコープ**: 
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.app.created`
  - `https://www.googleapis.com/auth/calendar.calendars`

## 会議室管理での活用

### 会議室カレンダーの作成
```json
{
  "summary": "会議室A",
  "description": "3階の大会議室、プロジェクター完備",
  "location": "東京オフィス 3F",
  "timeZone": "Asia/Tokyo",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": ["hangoutsMeet"]
  }
}
```

### 会議室情報の管理
- `summary`: 会議室名
- `description`: 設備情報、収容人数、利用規則など
- `location`: 物理的な位置情報
- `timeZone`: タイムゾーン設定

## カレンダータイプ

### 1. プライマリカレンダー
- ユーザーのメインカレンダー
- 削除不可
- `clear` 操作で全イベント削除可能

### 2. セカンダリカレンダー
- 追加で作成されたカレンダー
- 削除可能
- 会議室カレンダーとして使用

### 3. リソースカレンダー
- Google Workspace の Domain Resources
- Directory API で作成
- 会議室、設備などの共有リソース用

## カレンダーID の取得方法

### calendarList.list() の使用
カレンダー操作に必要な `calendarId` は以下の方法で取得できます：

```javascript
// カレンダー一覧の取得
GET https://www.googleapis.com/calendar/v3/users/me/calendarList

// レスポンス例
{
  "items": [
    {
      "id": "primary",
      "summary": "メインカレンダー"
    },
    {
      "id": "c_1234567890abcdef@group.calendar.google.com",
      "summary": "会議室A"
    }
  ]
}
```

### 特殊なカレンダーID
- `"primary"`: 現在ログイン中ユーザーのメインカレンダー
- メールアドレス形式: セカンダリカレンダーやリソースカレンダー

## 配列フィールドの更新挙動

### patch/update 操作での注意点
- 配列フィールド（例: `conferenceProperties.allowedConferenceSolutionTypes`）は**完全置換**
- 既存の配列に要素を追加する場合も、全要素を指定する必要がある

```json
// 既存: ["hangoutsMeet"]
// 追加したい場合の正しいリクエスト
{
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": ["hangoutsMeet", "eventHangout"]
  }
}
```

## 実装時の考慮事項

### アクセス権限
- カレンダーの作成には適切な OAuth スコープが必要
- 会議室カレンダーは組織全体でアクセス可能に設定

### 命名規則
- 会議室カレンダーの命名規則を統一
- 例: "会議室A", "Room-A", "Conference Room A"

### メタデータ活用
- `description` フィールドで詳細情報を管理
- 設備情報、収容人数、利用規則などを記載
- `location` フィールドで物理的位置を明確化

### タイムゾーン管理
- 組織の標準タイムゾーンを設定
- 複数拠点の場合は拠点ごとのタイムゾーンを適用

## レスポンス形式の詳細

### 成功レスポンス

#### Calendar リソース構造
```json
{
  "kind": "calendar#calendar",
  "etag": "\"abcdefghijk\"",
  "id": "c_1234567890abcdef@group.calendar.google.com",
  "summary": "会議室A",
  "description": "3階の大会議室、プロジェクター完備",
  "location": "東京オフィス 3F",
  "timeZone": "Asia/Tokyo",
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": [
      "hangoutsMeet"
    ]
  }
}
```

#### 空のレスポンス（clear/delete）
- HTTP ステータス: 204 No Content
- レスポンスボディ: なし

### エラーレスポンス

#### 400 Bad Request
```json
{
  "error": {
    "code": 400,
    "message": "無効なリクエスト",
    "errors": [
      {
        "domain": "global",
        "reason": "invalidParameter",
        "message": "無効なパラメータ値"
      }
    ]
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "code": 403,
    "message": "アクセスが拒否されました",
    "errors": [
      {
        "domain": "global",
        "reason": "forbidden",
        "message": "権限不足またはOAuthスコープの確認が必要"
      }
    ]
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "code": 404,
    "message": "リソースが見つかりません",
    "errors": [
      {
        "domain": "global",
        "reason": "notFound",
        "message": "カレンダーが存在しないまたはIDの確認が必要"
      }
    ]
  }
}
```

#### 409 Conflict
```json
{
  "error": {
    "code": 409,
    "message": "競合状態",
    "errors": [
      {
        "domain": "global",
        "reason": "conflict",
        "message": "同名のカレンダーが既に存在し、重複チェックの実装が必要"
      }
    ]
  }
}
```

## エラーハンドリング

### 403 Forbidden
- 権限不足
- OAuth スコープの確認が必要

### 404 Not Found
- カレンダーが存在しない
- カレンダー ID の確認が必要

### 409 Conflict
- 同名のカレンダーが既に存在
- 重複チェックの実装が必要