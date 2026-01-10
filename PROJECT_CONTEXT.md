# PROJECT_CONTEXT.md (Admin Panel Focus)

## 1. プロジェクト概要：AIクリエイティブスタジオ

AIによる自動記事生成システムを管理するための**マルチテナント型ダッシュボード**。管理者はこの画面から、複数のメディア（健康、ウイスキー、神社等）の執筆指示、記事レビュー、画像確認を一元管理する。

## 2. 管理者画面の主要機能（実装対象）

1. **認証・ガード**: Firebase Auth（Google Login）による認証。許可された管理者（`user_permissions` テーブルに存在するユーザー）のみがダッシュボードを閲覧可能。
2. **マルチサイト管理**:
   - 管理可能なサイト一覧のカード表示。
   - サイトごとのトーン設定（System Prompt）、WP連携情報の編集。

3. **記事レビュー・修正UI（最重要）**:
   - 生成された記事HTMLのプレビュー（SWELLテーマの装飾を再現）。
   - AIが参考にしたリサーチ元データ（ソース）との並列表示（ハルシネーション確認用）。
   - フィードバック入力と、n8n Webhookをキックする「再生成」ボタン。

4. **ステータス監視**: 各サイトの稼働状況や、n8n側の実行エラーログの表示。

## 3. 技術スタック（フロントエンド周辺）

- **Framework**: Next.js (App Router), Tailwind CSS, Lucide React (Icons)
- **Auth**: Firebase Authentication (Client-side SDK)
- **Database**: Supabase (PostgreSQL / RLS)
- **API Communication**:
  - Supabase Client SDK でデータの取得・更新。
  - `fetch` API で n8n の Webhook URL に JSON を POST。

## 4. データベース連携（Supabase）

### テーブル構造

```sql
-- サイト基本情報
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT,
  wp_url TEXT,
  wp_username TEXT,
  wp_app_password TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー権限（Firebase UIDとsite_idの紐付け）
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firebase_uid, site_id)
);

-- 記事データ
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_html TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  source_data JSONB DEFAULT '[]',
  feedback_history JSONB DEFAULT '[]',
  wp_post_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) ポリシー
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
```

## 5. UI/UX ガイドライン

- **Design**: 清潔感のあるモダンなSaaSスタイル。サイドバーナビゲーションを採用。
- **Responsive**: PCでの管理作業をメインとするが、スマホでの簡易レビューも考慮する。
- **Preview Accuracy**: 記事プレビュー画面では、WordPressテーマ「SWELL」の主要な装飾クラス（`is-style-memo_box` 等）がそれらしく表示されるようCSSを当てる。

## 6. インテグレーション・ルール

### n8n連携

再生成ボタン押下時、以下のペイロードをWebhookに送信する：

```json
{
  "article_id": "UUID",
  "feedback": "string",
  "user_token": "Firebase_ID_Token"
}
```

### セキュリティ

すべてのデータ取得リクエストに、Firebase Auth の UID または IDトークンを紐付け、SupabaseのRLS（行レベルセキュリティ）で他者のデータが見えないようにする。

## 7. ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ランディングページ（ログイン）
│   └── dashboard/          # ダッシュボード（認証必須）
│       ├── layout.tsx      # サイドバー付きレイアウト
│       ├── page.tsx        # サイト一覧
│       └── [siteId]/       # サイト詳細
│           ├── page.tsx    # 記事一覧
│           ├── settings/   # サイト設定
│           └── articles/
│               └── [articleId]/  # 記事詳細・レビュー
├── components/             # 共通UIコンポーネント
│   ├── Sidebar.tsx         # サイドバーナビ
│   └── swell/              # SWELLテーマ風プレビュー用
├── contexts/               # React Context (認証等)
├── lib/                    # ユーティリティ
│   ├── firebase.ts         # Firebase初期化
│   ├── supabase.ts         # Supabaseクライアント
│   ├── sites.ts            # サイト関連API
│   ├── articles.ts         # 記事関連API
│   └── n8n.ts              # n8n Webhook連携
└── types/                  # TypeScript型定義
```

## 8. 環境変数

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# n8n (Server-side only)
N8N_WEBHOOK_BASE_URL=
```

## 9. 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # ESLint実行
```
