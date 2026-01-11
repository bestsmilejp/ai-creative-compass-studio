# AI記事自動生成システム - 技術ドキュメント

## システム概要

n8nワークフローとNext.js APIを連携し、AIを活用してWordPress記事を自動生成・投稿するシステム。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        n8n Workflow                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ Schedule │ → │ API取得  │ → │ AI生成   │ → │ WP投稿   │     │
│  │ Trigger  │   │ (設定)   │   │ (記事)   │   │          │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
└─────────────────────────────────────────────────────────────────┘
        │                                              │
        ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API (Firebase App Hosting)            │
│  /api/n8n/schedules/due    - スケジュール取得                    │
│  /api/n8n/sites/{id}/keywords - キーワード取得                   │
│  /api/n8n/sites/{id}/articles - 記事履歴                        │
│  /api/n8n/jobs              - ジョブ作成・更新                   │
│  /api/n8n/schedules/{id}    - スケジュール更新                   │
│  /api/n8n/keywords/{id}     - キーワード使用回数更新             │
│  /api/sites/{id}/jobs/{jobId} - ジョブステータス変更（管理画面用）│
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  sites / site_keywords / site_schedules / articles / article_jobs│
└─────────────────────────────────────────────────────────────────┘
```

---

## データベーススキーマ

### sites
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| name | TEXT | サイト名 |
| slug | TEXT | スラッグ |
| wp_url | TEXT | WordPress URL |
| wp_username | TEXT | WPユーザー名 |
| wp_app_password | TEXT | WPアプリパスワード |
| system_prompt | TEXT | AI用システムプロンプト |
| n8n_webhook_url | TEXT | n8n Webhook URL（オプション） |
| is_active | BOOLEAN | 有効/無効 |

### site_keywords
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| site_id | UUID | サイトID (FK) |
| keyword | TEXT | キーワード |
| priority | INTEGER | 優先度 |
| is_active | BOOLEAN | 有効/無効 |
| use_count | INTEGER | 使用回数 |
| last_used_at | TIMESTAMP | 最終使用日時 |
| notes | TEXT | メモ（執筆時のヒント） |

### site_schedules
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| site_id | UUID | サイトID (FK) |
| is_enabled | BOOLEAN | スケジュール有効/無効 |
| frequency_type | TEXT | daily/weekly/custom |
| time_of_day | TIME | 実行時刻 |
| days_of_week | INTEGER[] | 実行曜日 |
| custom_interval_hours | INTEGER | カスタム間隔（時間） |
| articles_per_run | INTEGER | 1回あたりの記事数 |
| last_run_at | TIMESTAMP | 最終実行日時 |
| next_run_at | TIMESTAMP | 次回実行予定 |

### articles
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| site_id | UUID | サイトID (FK) |
| title | TEXT | 記事タイトル |
| status | TEXT | draft/review/published |
| wp_post_id | INTEGER | WordPress記事ID |
| source_data | JSONB | 生成時のメタデータ |

### article_jobs
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| site_id | UUID | サイトID (FK) |
| wp_post_id | INTEGER | WordPress記事ID |
| status | TEXT | pending/processing/completed/failed |
| result_data | JSONB | 完了時の結果データ |
| error_message | TEXT | エラーメッセージ |
| started_at | TIMESTAMP | 開始日時 |
| completed_at | TIMESTAMP | 完了日時 |

---

## n8nワークフロー構成

### ノード一覧

1. **Schedule Trigger** - 5分ごとに実行
2. **設定** - 環境変数設定（APP_BASE_URL, N8N_API_KEY）
3. **スケジュール取得** - 実行予定のスケジュールを取得
4. **If** - スケジュールが存在するか判定
5. **Loop Over Items** - 複数サイトをループ処理
6. **キーワード取得** - アクティブなキーワードを取得
7. **過去記事取得** - 重複防止用の記事履歴取得
8. **ジョブ作成** - ジョブステータスを「処理中」で作成
9. **Thought Generator (Haiku)** - 記事の切り口を生成
10. **Research Agent (AI Agent + Gemini)** - Google Search連携リサーチ
11. **Writer Agent (Claude Sonnet)** - 記事本文を執筆
12. **Editor Agent (Gemini)** - 記事の校正・編集
13. **WordPress投稿** - WordPress REST APIで投稿
14. **スケジュール更新** - next_run_at, last_run_atを更新
15. **記事履歴保存** - articlesテーブルに記録
16. **キーワード更新** - use_count, last_used_atを更新
17. **ジョブ完了** - ステータスを「completed」に更新

### AI Agent設定

#### Thought Generator (Claude Haiku)
- 役割: 過去記事と異なる切り口を提案
- 入力: キーワード、システムプロンプト、過去記事タイトル
- 出力: 記事の切り口（angle）

#### Research Agent (AI Agent + Google Gemini)
- 役割: トピックのリサーチと情報収集
- ノード構成:
  - AI Agent ノード
  - Google Gemini Chat Model サブノード
  - Google Search Built-in Tool
- 設定:
  - **Thinking Budget**: 2048〜4096（深い推論）
  - **Temperature**: 0.1（事実への忠実さ優先）
  - **Max Tool Calls Iterations**: 5〜10
  - **Max Iterations**: 10
- 出力: リサーチ結果（エビデンス付き）

#### Writer Agent (Claude Sonnet)
- 役割: 記事本文の執筆
- 入力: キーワード、切り口、リサーチ結果、過去記事情報
- 出力: HTML形式の記事本文
- 特徴: 個人ブログの文体・パーソナリティを維持

---

## API認証

### n8n API認証
- ヘッダー: `x-api-key`
- 値: Firebase Secret Manager で管理

### WordPress認証
- Basic認証（アプリパスワード）
- 認証ヘッダー生成: `btoa(username + ':' + app_password)`

---

## セキュリティ対策

| 対策 | 状態 |
|------|------|
| API Key認証 | ✅ 実装済み |
| HTTPS通信 | ✅ 設定済み |
| UUID検証 | ✅ 実装済み |
| RLS (全テーブル) | ✅ 設定済み |
| WordPress専用ユーザー（Author権限） | ✅ 設定済み |
| Firebase Secret Manager | ✅ 設定済み |

### RLSポリシー
- 全テーブルでRLSを有効化
- Service Roleのみフルアクセス許可
- 匿名アクセスはブロック

---

## 環境変数

### Firebase App Hosting
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (Secret Manager)
N8N_API_KEY=xxx (Secret Manager)
```

### n8n Variables
```
APP_BASE_URL=https://your-app.web.app
N8N_API_KEY=xxx
```

---

## 管理画面機能

### ダッシュボード
- サイト一覧表示
- 各サイトの記事数・最終更新日時

### キーワード管理 (`/dashboard/[siteId]/keywords`)
- キーワードの追加・削除
- 優先度の変更（ドラッグ&ドロップ）
- 有効/無効の切り替え
- メモ（執筆時のヒント）の入力
- 使用回数・最終使用日時の表示

### スケジュール管理 (`/dashboard/[siteId]/schedule`)
- 実行頻度の設定（毎日/週次/カスタム）
- 実行時刻の設定
- 曜日の選択
- 1回あたりの記事数設定

### ジョブ状況 (`/dashboard/[siteId]/jobs`)
- ジョブ一覧（ステータス別フィルター）
- 処理時間の表示
- エラーメッセージの確認
- 30秒ごとの自動更新
- ジョブステータスの手動変更（処理中/待機中のジョブを完了/失敗に変更）

### ジョブ管理API (`/api/sites/[siteId]/jobs/[jobId]`)
- 管理画面からジョブステータスを変更するためのAPI
- PATCH: ステータスを更新（completed/failedに変更可能）
- 認証: 管理画面からのリクエストのみ（n8n API認証は不要）

---

## 将来実装予定

1. **キーワードごとの記事数上限と通知** (優先度: 中)
2. **n8nエラーハンドリング** (優先度: 中)
3. **WordPress認証情報のセキュリティ強化** (優先度: 低)

詳細は `docs/TODO_FEATURES.md` を参照。
