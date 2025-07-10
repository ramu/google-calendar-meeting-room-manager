# Google Calendar API v3 機能一覧

## 概要
Google Calendar API v3 は RESTful API として提供され、Google Calendar の Web インターフェースでできるほとんどの操作を実行できます。

### ベース URL
```
https://www.googleapis.com/calendar/v3
```

### HTTP メソッド
- `GET`: データの取得
- `POST`: 新しいリソースの作成
- `PUT`: リソースの完全更新
- `PATCH`: リソースの部分更新
- `DELETE`: リソースの削除

## 参考ドキュメント
- [Google Calendar API Overview](https://developers.google.com/workspace/calendar/api/guides/overview)
- [API Reference](https://developers.google.com/workspace/calendar/api/v3/reference)
- [Calendar API Resource Types](https://developers.google.com/workspace/calendar/api/resource_types)
- [Domain resources, rooms & calendars](https://developers.google.com/workspace/calendar/api/concepts/domain)

## 主要リソース

### 1. Events リソース
イベント（会議・予約）を管理するための中核リソース

#### 利用可能な操作
- `delete`: イベントの削除
- `get`: イベント詳細の取得
- `import`: プライベートイベントのコピー追加
- `insert`: 新しいイベントの作成
- `list`: 複数イベントの取得
- `move`: イベントの他カレンダーへの移動
- `patch`: イベントの部分更新
- `update`: イベントの完全更新
- `quickAdd`: テキストからのイベント作成
- `instances`: 繰り返しイベントのインスタンス取得
- `watch`: イベント変更の監視

### 2. Calendars リソース
カレンダーのメタデータを管理

#### 利用可能な操作
- `clear`: プライマリカレンダーの全イベント削除
- `delete`: セカンダリカレンダーの削除
- `get`: カレンダーメタデータの取得
- `insert`: セカンダリカレンダーの作成
- `patch`: カレンダーメタデータの部分更新
- `update`: カレンダーメタデータの完全更新

### 3. CalendarList リソース
ユーザーのカレンダーリストの管理

#### 利用可能な操作
- `delete`: カレンダーをユーザーのリストから削除
- `get`: カレンダーリストエントリの取得
- `insert`: カレンダーをユーザーのリストに追加
- `list`: ユーザーのカレンダーリストの取得
- `patch`: カレンダーリストエントリの部分更新
- `update`: カレンダーリストエントリの完全更新
- `watch`: カレンダーリストの変更監視

### 4. ACL (Access Control List) リソース
カレンダーのアクセス制御ルール管理

#### 利用可能な操作
- `delete`: アクセスルールの削除
- `get`: 特定のアクセスルールの取得
- `insert`: 新しいアクセスルールの作成
- `list`: カレンダーのアクセスルール一覧取得
- `patch`: アクセスルールの部分更新
- `update`: アクセスルールの完全更新
- `watch`: アクセスルールの変更監視

### 5. Settings リソース
ユーザー設定の管理

#### 利用可能な操作
- `get`: 特定の設定項目の取得
- `list`: ユーザー設定の一覧取得
- `watch`: 設定変更の監視

### 6. Channels リソース
リソース変更の監視チャンネル管理

#### 利用可能な操作
- `stop`: 監視チャンネルの停止

### 7. Colors リソース
カレンダーとイベントの色定義管理

#### 利用可能な操作
- `get`: 色定義の取得

### 8. Freebusy リソース
複数カレンダーの空き時間情報管理

#### 利用可能な操作
- `query`: 複数カレンダーの空き時間確認

## 会議室管理における重要な機能

### Domain Resources
- Google Workspace 顧客向けの機能
- 会議室やプロジェクターなどのリソースの予約が可能
- リソースをイベントの参加者として追加することで予約
- リソースは自動的に利用可能性とアクセス権に基づいて承認/拒否

### Conference Data
- 会議情報の管理
- ビデオ会議の設定
- 対応する会議ソリューション:
  - `eventHangout`
  - `eventNamedHangout`
  - `hangoutsMeet`

### 認証方式
- OAuth 2.0 による認証
- サービスアカウントによる認証
- ドメイン全体の委任による認証

## 詳細なパラメータとレスポンス情報

### 共通パラメータ
- `calendarId`: カレンダーの識別子（必須）
- `eventId`: イベントの識別子（イベント操作時必須）
- `fields`: 返却するフィールドの指定（オプション）
- `prettyPrint`: JSON出力の整形（オプション、デフォルト: true）

### 共通レスポンスフィールド
- `kind`: リソースタイプを示す文字列
- `etag`: リソースのバージョン情報
- `nextPageToken`: ページング用トークン（リスト操作）
- `items`: リソースの配列（リスト操作）

### Events リソース詳細

#### 主要パラメータ
- `timeMin`: 検索開始時刻（ISO 8601形式）
- `timeMax`: 検索終了時刻（ISO 8601形式）
- `q`: フリーテキスト検索クエリ
- `orderBy`: ソート順（startTime | updated）
- `maxResults`: 最大取得件数（1-2500）
- `singleEvents`: 繰り返しイベントを展開（boolean）
- `showDeleted`: 削除済みイベントも含める（boolean）

#### 主要レスポンスフィールド
- `id`: イベントID
- `summary`: イベントタイトル
- `description`: イベント説明
- `start`: 開始日時オブジェクト
- `end`: 終了日時オブジェクト
- `attendees`: 参加者配列
- `location`: 場所
- `status`: イベント状態（confirmed | tentative | cancelled）
- `visibility`: 可視性（default | public | private | confidential）
- `recurrence`: 繰り返しルール配列

### CalendarList リソース詳細

#### 主要レスポンスフィールド
- `id`: カレンダーID
- `summary`: カレンダー名
- `description`: カレンダー説明
- `timeZone`: タイムゾーン
- `colorId`: 色ID
- `backgroundColor`: 背景色
- `foregroundColor`: 前景色
- `accessRole`: アクセスレベル（owner | reader | writer | freeBusyReader）
- `defaultReminders`: デフォルトリマインダー配列

### ACL リソース詳細

#### 主要パラメータ
- `role`: アクセスレベル（owner | reader | writer | freeBusyReader）
- `scope`: スコープオブジェクト（type: user/group/domain, value: email等）

#### 主要レスポンスフィールド
- `id`: ルールID
- `role`: 付与されるロール
- `scope`: 適用スコープ

### Freebusy リソース詳細

#### 主要パラメータ
- `timeMin`: 確認開始時刻（必須）
- `timeMax`: 確認終了時刻（必須）
- `items`: 確認対象カレンダーIDの配列（必須）
- `groupExpansionMax`: グループ展開の最大数
- `calendarExpansionMax`: カレンダー展開の最大数

#### 主要レスポンスフィールド
- `timeMin`: 確認期間開始
- `timeMax`: 確認期間終了
- `calendars`: カレンダー別の空き時間情報
- `groups`: グループ情報（該当する場合）

## API 制限事項
- **クォータ制限**: 1日あたりのリクエスト数制限
- **レート制限**: 100 requests/100 seconds/user
- **バッチリクエスト**: 最大50リクエストまで同時実行可能
- **リソースカレンダーの作成**: Directory API が必要
- **監視チャンネル**: 有効期限あり（最大1週間）

## エラーレスポンス
### 一般的なエラーコード
- `400`: Bad Request - リクエストパラメータエラー
- `401`: Unauthorized - 認証エラー
- `403`: Forbidden - 権限不足・クォータ超過
- `404`: Not Found - リソースが存在しない
- `409`: Conflict - リソース競合
- `410`: Gone - リソースが削除済み
- `429`: Too Many Requests - レート制限超過
- `500`: Internal Server Error - サーバーエラー

### エラーレスポンス形式
```json
{
  "error": {
    "code": 400,
    "message": "エラーの詳細メッセージ",
    "errors": [
      {
        "domain": "global",
        "reason": "invalid",
        "message": "具体的なエラー内容"
      }
    ]
  }
}
```

## 実装時の考慮事項
- **OAuth スコープ**: 適切なスコープの選択（calendar、calendar.readonly等）
- **エラーハンドリング**: 指数バックオフによるリトライ実装
- **同期機能**: webhook監視とポーリングの組み合わせ
- **レート制限対応**: リクエスト間隔の調整
- **データ整合性**: ETagを利用した競合回避
- **セキュリティ**: サービスアカウント使用時の権限最小化