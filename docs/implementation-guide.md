# 実装ガイド

## 概要
Google Calendar API を利用した会議室管理システムの実装ガイドです。

## 参考ドキュメント
- [Google Calendar API Overview](https://developers.google.com/workspace/calendar/api/guides/overview)
- [API Reference](https://developers.google.com/workspace/calendar/api/v3/reference)
- [Auth Guide | Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/auth)
- [Quickstart | Google Calendar API](https://developers.google.com/workspace/calendar/api/quickstart/nodejs)
- [Best Practices | Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/best-practices)
- [Error Handling | Google APIs](https://developers.google.com/workspace/guides/error-handling)
- [Quotas & Limits | Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/quotas)

## 認証設定

### 1. Google Cloud Console での設定
1. Google Cloud Console でプロジェクトを作成
2. Calendar API を有効化
3. OAuth 2.0 クレデンシャルを作成
4. 承認済みリダイレクト URI を設定

### 2. 必要な OAuth スコープ
```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];
```

## アーキテクチャ設計

### 1. データモデル
```typescript
// 会議室
interface MeetingRoom {
  id: string;
  name: string;
  calendarId: string;
  description?: string;
  location?: string;
  capacity: number;
  equipment: string[];
  timeZone: string;
}

// 予約
interface Booking {
  id: string;
  eventId: string;
  calendarId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  organizer: string;
  attendees: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurringEventId?: string;
}
```

### 2. API 構成
```
/api/v1/
  ├── /auth          # 認証関連
  ├── /rooms         # 会議室管理
  │   ├── GET /      # 会議室一覧
  │   ├── POST /     # 会議室作成
  │   ├── GET /:id   # 会議室詳細
  │   ├── PUT /:id   # 会議室更新
  │   └── DELETE /:id # 会議室削除
  ├── /bookings      # 予約管理
  │   ├── GET /      # 予約一覧
  │   ├── POST /     # 予約作成
  │   ├── GET /:id   # 予約詳細
  │   ├── PUT /:id   # 予約更新
  │   └── DELETE /:id # 予約削除
  └── /availability  # 空き時間検索
      └── GET /      # 空き時間取得
```

## 実装パターン

### 1. 会議室の作成
```typescript
async function createMeetingRoom(roomData: MeetingRoom): Promise<string> {
  // 1. カレンダーを作成
  const calendar = await gapi.client.calendar.calendars.insert({
    resource: {
      summary: roomData.name,
      description: roomData.description,
      location: roomData.location,
      timeZone: roomData.timeZone,
      conferenceProperties: {
        allowedConferenceSolutionTypes: ['hangoutsMeet']
      }
    }
  });

  // 2. ACL を設定（組織全体でアクセス可能）
  await gapi.client.calendar.acl.insert({
    calendarId: calendar.result.id,
    resource: {
      role: 'reader',
      scope: {
        type: 'domain',
        value: 'company.com'
      }
    }
  });

  return calendar.result.id;
}
```

### 2. 予約の作成
```typescript
async function createBooking(booking: Booking): Promise<string> {
  const event = await gapi.client.calendar.events.insert({
    calendarId: booking.calendarId,
    resource: {
      summary: booking.title,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: 'Asia/Tokyo'
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: 'Asia/Tokyo'
      },
      attendees: [
        {
          email: `${booking.calendarId}@group.calendar.google.com`,
          resource: true
        },
        ...booking.attendees.map(email => ({ email }))
      ],
      organizer: {
        email: booking.organizer
      }
    }
  });

  return event.result.id;
}
```

### 3. 空き時間の検索
```typescript
async function findAvailableSlots(
  roomIds: string[],
  startTime: Date,
  endTime: Date,
  duration: number
): Promise<TimeSlot[]> {
  const freebusy = await gapi.client.calendar.freebusy.query({
    resource: {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: roomIds.map(id => ({ id }))
    }
  });

  const availableSlots: TimeSlot[] = [];
  
  for (const [roomId, busyTimes] of Object.entries(freebusy.result.calendars)) {
    const slots = calculateFreeSlots(busyTimes.busy, startTime, endTime, duration);
    availableSlots.push(...slots.map(slot => ({ ...slot, roomId })));
  }

  return availableSlots;
}
```

## エラーハンドリング

### 1. 認証エラー
```typescript
if (error.status === 401) {
  // トークンの再取得
  await refreshAccessToken();
  // リクエストを再試行
  return retryRequest();
}
```

### 2. レート制限
```typescript
if (error.status === 429) {
  const retryAfter = parseInt(error.headers['Retry-After'] || '60');
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return retryRequest();
}
```

### 3. 会議室の重複予約
```typescript
if (error.status === 409) {
  throw new BookingConflictError('指定時間は既に予約されています');
}
```

## パフォーマンス最適化

### 1. バッチリクエスト
```typescript
const batch = gapi.client.newBatch();
roomIds.forEach(roomId => {
  batch.add(gapi.client.calendar.events.list({
    calendarId: roomId,
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString()
  }));
});

const responses = await batch.then();
```

### 2. キャッシュ戦略
- 会議室リストのキャッシュ（30分）
- 予約データのキャッシュ（5分）
- 空き時間の計算結果キャッシュ（1分）

### 3. 同期とWebhook
```typescript
// Webhook エンドポイント
app.post('/webhooks/calendar', (req, res) => {
  const { resourceId, eventType } = req.body;
  
  switch (eventType) {
    case 'sync':
      syncCalendarEvents(resourceId);
      break;
    case 'exists':
      // 既存イベントの処理
      break;
  }
  
  res.status(200).send('OK');
});
```

## セキュリティ考慮事項

### 1. スコープの最小化
- 必要最小限のスコープのみ要求
- 読み取り専用が可能な場合は読み取り専用スコープを使用

### 2. トークンの管理
- アクセストークンの安全な保存
- リフレッシュトークンの暗号化
- トークンの適切な有効期限管理

### 3. 入力値検証
- 日時の妥当性チェック
- 会議室 ID の検証
- ユーザー権限の確認

## 監視とログ

### 1. API 使用量の監視
- クォータの使用状況を追跡
- レート制限の回避策実装

### 2. エラーログの記録
- API エラーの詳細ログ
- ユーザー操作のログ
- システム異常の検知

### 3. 可用性の監視
- API レスポンス時間の監視
- エラー率の追跡
- アラート設定