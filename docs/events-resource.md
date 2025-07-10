# Events リソース詳細仕様

## 概要
Events リソースは Google Calendar API の中核となるリソースで、カレンダー上のイベント（会議、予約など）を表現します。

## 参考ドキュメント
- [Events | Google Calendar API](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Event types | Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/event-types)
- [Recurring events | Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/recurringevents)
- [Events: list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Events: insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)

## Events リソースのプロパティ

### 基本情報
- `kind`: リソースタイプ（常に "calendar#event"）
- `etag`: リソースの ETag
- `id`: イベントの一意識別子
- `summary`: イベントタイトル
- `description`: イベントの詳細説明
- `location`: 地理的位置情報
- `start`: 開始日時
- `end`: 終了日時
- `status`: イベントステータス（confirmed/tentative/cancelled）
- `visibility`: 公開設定（default/public/private/confidential）
- `transparency`: カレンダー上でのブロック設定（opaque/transparent）
- `created`: イベント作成日時
- `updated`: 最終更新日時
- `htmlLink`: Googleカレンダー上でのイベントリンク
- `iCalUID`: iCalendar形式のUID
- `sequence`: iCalendarの更新シーケンス番号
- `eventType`: イベントタイプ（default/birthday/focusTime/outOfOffice/workingLocation）
- `hangoutLink`: Google Meetリンク（非推奨、conferenceDataを使用）

### 参加者情報
- `creator`: イベント作成者の詳細
  - `id`: 作成者ID
  - `email`: 作成者のメールアドレス
  - `displayName`: 表示名
  - `self`: 自分自身かどうか（デフォルト: false）
- `organizer`: イベント主催者の情報
  - `id`: 主催者ID
  - `email`: 主催者のメールアドレス
  - `displayName`: 表示名
  - `self`: 自分自身かどうか（デフォルト: false）
- `attendees`: 参加者リスト（配列）
  - `id`: 参加者ID（任意）
  - `email`: メールアドレス（追加時必須）
  - `displayName`: 表示名（任意）
  - `organizer`: 主催者かどうか
  - `self`: 自分自身かどうか
  - `resource`: リソース（会議室など）かどうか
  - `optional`: 任意参加かどうか（デフォルト: false）
  - `responseStatus`: 回答ステータス（needsAction/declined/tentative/accepted）
  - `comment`: コメント（任意）
  - `additionalGuests`: 追加ゲスト数（デフォルト: 0）
- `guestsCanInviteOthers`: 招待権限の設定
- `guestsCanModify`: 修正権限の設定
- `guestsCanSeeOtherGuests`: 他の参加者の表示権限

### 高度な機能
- `recurrence`: 繰り返しイベントのルール（RRULE配列）
- `conferenceData`: 会議・ビデオ会議の詳細
  - `createRequest`: 会議作成リクエスト（requestId, conferenceSolutionKey, status）
  - `entryPoints`: 参加方法の配列（entryPointType, uri, label, pin）
  - `conferenceSolution`: 会議ソリューション（key, name, iconUri）
  - `conferenceId`: 会議ID
  - `signature`: 署名
  - `notes`: 会議メモ
- `reminders`: 通知設定
  - `useDefault`: デフォルト通知を使用するかどうか
  - `overrides`: カスタム通知設定の配列
    - `method`: 通知方法（email/popup）
    - `minutes`: 通知タイミング（0-40320分前）
- `attachments`: イベントの添付ファイル（最大25個）
  - `fileUrl`: ファイルURL
  - `title`: ファイルタイトル
  - `mimeType`: MIMEタイプ
  - `iconLink`: アイコンリンク
  - `fileId`: ファイルID
- `extendedProperties`: カスタムメタデータ
  - `private`: プライベートキー値ペア
  - `shared`: 共有キー値ペア
- `originalStartTime`: 繰り返しイベントの元の開始時間
- `recurringEventId`: 繰り返しイベントの ID

### 表示・制御設定
- `colorId`: カスタムイベントカラー
- `locked`: コアイベントフィールドの変更を防止
- `privateCopy`: イベント伝播を無効化
- `source`: イベント作成元の詳細情報
- `transparency`: busy/available ステータス
- `visibility`: イベントのプライバシーレベル

### 特殊イベントタイプ別プロパティ

#### Birthday Events (`eventType: "birthday"`)
- `birthdayProperties`: 誕生日イベント固有の設定
  - `contact`: 連絡先リソース名
  - `type`: イベントタイプ（birthday, anniversaryなど）
  - `customTypeName`: 特別イベントのカスタムラベル

#### Working Location Events (`eventType: "workingLocation"`)
- `workingLocationProperties`: 勤務場所イベント固有の設定
  - `type`: 勤務場所タイプ（homeOffice, office, custom）
  - `homeOffice`: 在宅勤務を示すブール値
  - `officeLocation`: オフィス詳細情報
    - `buildingId`: 建物ID
    - `floorId`: フロアID
    - `deskId`: デスクID
    - `label`: 場所ラベル

#### Focus Time Events (`eventType: "focusTime"`)
- `focusTimeProperties`: 集中時間イベント固有の設定
  - `autoDeclineMode`: 会議辞退戦略
  - `chatStatus`: Chatでのユーザー可用性
  - `declineMessage`: 自動辞退レスポンス

#### Out of Office Events (`eventType: "outOfOffice"`)
- `outOfOfficeProperties`: 不在イベント固有の設定
  - `autoDeclineMode`: 会議辞退戦略
  - `declineMessage`: 自動辞退レスポンス

### 日時の表現
```json
{
  "start": {
    "dateTime": "2025-07-10T10:00:00Z",
    "timeZone": "Asia/Tokyo"
  },
  "end": {
    "dateTime": "2025-07-10T11:00:00Z",
    "timeZone": "Asia/Tokyo"
  }
}
```

### 参加者の表現
```json
{
  "attendees": [
    {
      "email": "meeting-room-a@company.com",
      "displayName": "Meeting Room A",
      "resource": true,
      "responseStatus": "accepted"
    },
    {
      "email": "user@company.com",
      "displayName": "User Name",
      "responseStatus": "needsAction"
    }
  ]
}
```

## 利用可能な操作

### 1. delete
- **機能**: イベントの削除
- **必須パラメータ**: calendarId, eventId
- **任意パラメータ**: sendUpdates（通知送信オプション）
- **レスポンス**: 204 No Content

### 2. get
- **機能**: イベント詳細の取得
- **必須パラメータ**: calendarId, eventId
- **任意パラメータ**: 
  - maxAttendees: 含める参加者の最大数
  - timeZone: タイムゾーン指定
- **レスポンス**: Event リソース

### 3. insert
- **機能**: 新しいイベントの作成
- **必須パラメータ**: calendarId, Event リソース（start, endは必須）
- **任意パラメータ**: 
  - conferenceDataVersion: 会議データサポートのバージョン（0-1）
  - maxAttendees: 含める参加者の最大数
  - sendUpdates: 通知送信オプション（all, externalOnly, none）
  - supportsAttachments: 添付ファイルサポートの有無
- **レスポンス**: 作成された Event リソース

### 4. list
- **機能**: 複数イベントの取得
- **必須パラメータ**: calendarId
- **任意パラメータ**: 
  - timeMin, timeMax: 時間範囲フィルタ
  - q: フリーテキスト検索
  - maxResults: 返却する最大イベント数（デフォルト250、最大2500）
  - singleEvents: 繰り返しイベントを個別インスタンスに展開
  - eventTypes: イベントタイプでフィルタリング（default, birthday, focusTime, outOfOffice, workingLocation）
  - orderBy: 結果の並び順（startTime, updated）
  - showDeleted: 削除されたイベントを含むかどうか
  - syncToken: 増分同期用トークン
  - pageToken: ページネーション用トークン
- **レスポンス**: Events リストを含む Events リソース（ページネーション情報含む）

### 5. patch
- **機能**: イベントの部分更新
- **必須パラメータ**: calendarId, eventId, Event リソース（部分）
- **任意パラメータ**: 
  - conferenceDataVersion: 会議データサポートのバージョン
  - maxAttendees: 含める参加者の最大数
  - sendUpdates: 通知送信オプション
  - supportsAttachments: 添付ファイルサポートの有無
- **レスポンス**: 更新された Event リソース

### 6. update
- **機能**: イベントの完全更新
- **必須パラメータ**: calendarId, eventId, Event リソース（完全）
- **任意パラメータ**: 
  - conferenceDataVersion: 会議データサポートのバージョン
  - maxAttendees: 含める参加者の最大数
  - sendUpdates: 通知送信オプション
  - supportsAttachments: 添付ファイルサポートの有無
- **レスポンス**: 更新された Event リソース

### 7. quickAdd
- **機能**: テキストからのイベント作成
- **必須パラメータ**: calendarId, text
- **任意パラメータ**: sendUpdates（通知送信オプション）
- **レスポンス**: 作成された Event リソース

### 8. watch
- **機能**: イベント変更の監視
- **パラメータ**: calendarId, Channel リソース
- **レスポンス**: Channel リソース

### 9. import
- **機能**: 既存イベントのプライベートコピーを追加
- **パラメータ**: calendarId, Event リソース
- **レスポンス**: インポートされた Event リソース

### 10. instances
- **機能**: 繰り返しイベントのインスタンスを取得
- **パラメータ**: calendarId, eventId, timeMin, timeMax など
- **レスポンス**: Events リストを含む Events リソース

### 11. move
- **機能**: イベントを異なるカレンダー間で移動
- **パラメータ**: calendarId, eventId, destination（移動先カレンダーID）
- **レスポンス**: 移動された Event リソース

## 特殊なイベントタイプ

### 1. 繰り返しイベント
- `recurrence` フィールドで RRULE を指定
- 個別のインスタンスを修正可能
- 元の繰り返しイベントと個別インスタンスの関係を管理

### 2. 全日イベント
- `start` と `end` で `date` フィールドを使用
- `dateTime` は使用しない

### 3. リソースイベント
- 会議室などのリソースを `attendees` に追加
- `resource: true` フラグで識別

## 会議室管理での活用例

### 会議室予約の作成
```json
{
  "summary": "チーム会議",
  "start": {
    "dateTime": "2025-07-10T10:00:00Z",
    "timeZone": "Asia/Tokyo"
  },
  "end": {
    "dateTime": "2025-07-10T11:00:00Z",
    "timeZone": "Asia/Tokyo"
  },
  "attendees": [
    {
      "email": "meeting-room-a@company.com",
      "resource": true
    }
  ]
}
```

### 空き時間の確認
- `list` 操作で特定の時間範囲のイベントを取得
- `timeMin` と `timeMax` パラメータで時間範囲を指定
- 結果を分析して空き時間を特定

## レスポンス形式詳細

### 単一イベントレスポンス（get, insert, patch, update, quickAdd）
```json
{
  "kind": "calendar#event",
  "etag": "\"3181161784712000\"",
  "id": "event_id_here",
  "status": "confirmed",
  "htmlLink": "https://www.google.com/calendar/event?eid=...",
  "created": "2025-07-10T10:00:00.000Z",
  "updated": "2025-07-10T10:00:00.000Z",
  "summary": "イベントタイトル",
  "description": "イベントの詳細説明",
  "location": "会議室A",
  "creator": {
    "email": "creator@example.com",
    "displayName": "作成者名"
  },
  "organizer": {
    "email": "organizer@example.com",
    "displayName": "主催者名"
  },
  "start": {
    "dateTime": "2025-07-10T10:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "end": {
    "dateTime": "2025-07-10T11:00:00+09:00",
    "timeZone": "Asia/Tokyo"
  },
  "attendees": [
    {
      "email": "attendee@example.com",
      "displayName": "参加者名",
      "responseStatus": "accepted"
    }
  ]
}
```

### 複数イベントレスポンス（list, instances）
```json
{
  "kind": "calendar#events",
  "etag": "\"p32gdtl42tl1d40g\"",
  "summary": "カレンダー名",
  "description": "カレンダーの説明",
  "updated": "2025-07-10T10:00:00.000Z",
  "timeZone": "Asia/Tokyo",
  "accessRole": "owner",
  "defaultReminders": [
    {
      "method": "popup",
      "minutes": 10
    }
  ],
  "nextPageToken": "next_page_token_here",
  "nextSyncToken": "sync_token_here",
  "items": [
    {
      "kind": "calendar#event",
      "id": "event1",
      // ... 他のEventプロパティ
    },
    {
      "kind": "calendar#event",
      "id": "event2",
      // ... 他のEventプロパティ
    }
  ]
}
```

### 削除レスポンス（delete）
- HTTPステータス: 204 No Content
- レスポンスボディ: なし

### 監視レスポンス（watch）
```json
{
  "kind": "api#channel",
  "id": "channel_id",
  "resourceId": "resource_id",
  "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/...",
  "token": "target_token",
  "expiration": "1640995200000"
}
```

## エラーレスポンス

### 一般的なHTTPエラーステータス

#### 400 Bad Request
```json
{
  "error": {
    "code": 400,
    "message": "Invalid value for: Invalid format for event identifier",
    "errors": [
      {
        "domain": "global",
        "reason": "invalid",
        "message": "Invalid value for: Invalid format for event identifier"
      }
    ]
  }
}
```

#### 401 Unauthorized
```json
{
  "error": {
    "code": 401,
    "message": "Request is missing required authentication credential.",
    "errors": [
      {
        "domain": "global",
        "reason": "required",
        "message": "Login Required"
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
    "message": "Insufficient Permission",
    "errors": [
      {
        "domain": "global",
        "reason": "insufficientPermissions",
        "message": "Insufficient Permission"
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
    "message": "Not Found",
    "errors": [
      {
        "domain": "global",
        "reason": "notFound",
        "message": "Not Found"
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
    "message": "The requested identifier already exists.",
    "errors": [
      {
        "domain": "global",
        "reason": "duplicate",
        "message": "The requested identifier already exists."
      }
    ]
  }
}
```

#### 429 Too Many Requests
```json
{
  "error": {
    "code": 429,
    "message": "Rate Limit Exceeded",
    "errors": [
      {
        "domain": "usageLimits",
        "reason": "rateLimitExceeded",
        "message": "Rate Limit Exceeded"
      }
    ]
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "code": 500,
    "message": "Backend Error",
    "errors": [
      {
        "domain": "global",
        "reason": "backendError",
        "message": "Backend Error"
      }
    ]
  }
}
```

### エラー処理のベストプラクティス

1. **レート制限への対応**: 429エラーの場合は指数バックオフでリトライ
2. **認証エラーの処理**: 401/403エラーの場合はトークンの再取得
3. **一時的なエラー**: 500/503エラーの場合は適切な間隔でリトライ
4. **クライアントエラー**: 400/404エラーの場合はリクエスト内容を確認