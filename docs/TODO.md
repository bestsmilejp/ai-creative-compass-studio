# TODO リスト

このドキュメントは、後で行うタスクをまとめたものです。

---

## 高優先度

### Firebase App Hosting 環境変数の設定
- [ ] Firebase Console > App Hosting > View > Settings で環境変数を設定
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_ENABLE_SUPER_ADMIN` = `false`
  - `SUPABASE_SERVICE_ROLE_KEY` (Secret)
  - `N8N_API_KEY` (Secret)

### Supabase データベーステーブルの修正
- [ ] `article_jobs` テーブルに `result_data` カラムを追加
  ```sql
  ALTER TABLE article_jobs ADD COLUMN IF NOT EXISTS result_data JSONB;
  ```

---

## 中優先度

### カスタムドメインの設定
- [ ] Firebase App Hosting にカスタムドメインを接続
  - 候補: `studio.appbestsmile.com` など
  - 設定場所: Firebase Console > App Hosting > View > Domains > Add custom domain
  - DNS設定が必要

### n8n ワークフローの設定
- [ ] n8n で記事生成ワークフローを作成
- [ ] API エンドポイントの動作確認
  - `GET /api/n8n/schedules/due` - スケジュール確認
  - `POST /api/n8n/jobs` - ジョブ作成
  - `PATCH /api/n8n/jobs/[jobId]` - ジョブ更新
  - `GET /api/n8n/sites/[siteId]/keywords` - キーワード取得

---

## 低優先度

### Firebase Authentication 設定
- [ ] 本番環境の承認済みドメインを追加
  - Firebase Console > Authentication > Settings > Authorized domains

### セキュリティ強化
- [ ] Supabase RLS (Row Level Security) ポリシーの見直し
- [ ] API レート制限の実装検討

---

## 完了済み

- [x] Firebase App Hosting の初期設定
- [x] GitHub リポジトリとの連携
- [x] スーパー管理者機能の本番環境制限
- [x] セットアップドキュメントの作成 (`docs/FIREBASE_SETUP.md`)
