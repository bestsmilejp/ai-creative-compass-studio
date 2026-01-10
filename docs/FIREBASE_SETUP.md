# Firebase App Hosting セットアップガイド

このドキュメントは、AI Creative Compass Studio の Firebase App Hosting 設定手順をまとめたものです。

---

## 前提条件

- Firebase プロジェクト作成済み
- GitHub リポジトリ作成済み
- Firebase Blazeプラン（従量課金）への切り替え済み

---

## 1. Firebase Console での設定

### 1.1 App Hosting の有効化

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 対象プロジェクトを選択
3. 左メニューから **Build > App Hosting** を選択
4. **Get started** をクリック

### 1.2 GitHub 連携

1. **Connect to GitHub** をクリック
2. GitHub アカウントで認証
3. Firebase GitHub App に以下の権限を付与:
   - リポジトリへの読み取りアクセス
   - Webhooks の設定権限

### 1.3 リポジトリ設定

| 設定項目 | 説明 |
|---------|------|
| Repository | 対象の GitHub リポジトリを選択 |
| Live branch | `main` （本番デプロイ用ブランチ） |
| Root directory | `/` （プロジェクトルート） |

### 1.4 Firebase Web App の選択

- **Select an existing** を選択し、既存の Web App を選択
- または **Create new** で新規作成

### 1.5 リージョン設定

| リージョン | 説明 |
|-----------|------|
| `asia-northeast1` | 東京（日本向け推奨） |
| `asia-southeast1` | シンガポール |
| `us-central1` | アメリカ中部 |

---

## 2. 環境変数の設定

### 2.1 apphosting.yaml での設定

プロジェクトルートに `apphosting.yaml` を作成：

```yaml
# Firebase App Hosting configuration
runConfig:
  region: asia-southeast1
  memory: 512MiB

env:
  # Firebase Configuration
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: FIREBASE_API_KEY
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: <project-id>.firebaseapp.com
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: <project-id>
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: <project-id>.firebasestorage.app
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: "<sender-id>"
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: "<app-id>"

  # Supabase Configuration
  - variable: NEXT_PUBLIC_SUPABASE_URL
    value: https://<project-ref>.supabase.co
  - variable: NEXT_PUBLIC_SUPABASE_ANON_KEY
    secret: SUPABASE_ANON_KEY
  - variable: SUPABASE_SERVICE_ROLE_KEY
    secret: SUPABASE_SERVICE_ROLE_KEY

  # n8n Configuration
  - variable: N8N_API_KEY
    secret: N8N_API_KEY

  # App Configuration
  - variable: NEXT_PUBLIC_ENABLE_SUPER_ADMIN
    value: "false"
```

### 2.2 シークレットの設定（Firebase CLI）

```bash
# Firebase プロジェクトを選択
firebase use <project-id>

# シークレットを設定（対話形式で値を入力）
firebase apphosting:secrets:set FIREBASE_API_KEY
firebase apphosting:secrets:set SUPABASE_ANON_KEY
firebase apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY
firebase apphosting:secrets:set N8N_API_KEY
```

各シークレット設定時に、apphosting.yaml への追加を確認されたら `Y` を選択。

### 2.3 環境変数一覧

| 変数名 | 種別 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Secret | Firebase API キー |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Value | Firebase Auth ドメイン |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Value | Firebase プロジェクト ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Value | Firebase Storage バケット |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Value | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Value | Firebase App ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Value | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase Service Role Key |
| `N8N_API_KEY` | Secret | n8n API 認証キー |
| `NEXT_PUBLIC_ENABLE_SUPER_ADMIN` | Value | スーパー管理者機能の有効化 |

---

## 3. プロジェクト内の設定ファイル

### 3.1 firebase.json

```json
{
  "hosting": {
    "source": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "frameworksBackend": {
      "region": "asia-southeast1"
    }
  }
}
```

### 3.2 .firebaserc

```json
{
  "projects": {
    "default": "<project-id>"
  }
}
```

---

## 4. 自動デプロイの仕組み

### 4.1 トリガー

| イベント | 動作 |
|---------|------|
| `main` ブランチへの push | 本番環境にデプロイ |
| Pull Request 作成 | プレビュー環境を作成 |

### 4.2 ビルドプロセス

1. GitHub から最新コードを取得
2. `npm install` で依存関係をインストール
3. `npm run build` で Next.js をビルド
4. Cloud Run にデプロイ

### 4.3 デプロイ URL

| 環境 | URL パターン |
|------|-------------|
| 本番 | `https://<project>--<backend>.region.hosted.app` |
| プレビュー | `https://<project>--pr-XX-xxxxx.region.hosted.app` |

---

## 5. 本番環境での制限設定

### 5.1 スーパー管理者機能の無効化

本番環境では `NEXT_PUBLIC_ENABLE_SUPER_ADMIN=false` を設定することで:

- `/dashboard/admin` ページは「管理機能は無効です」と表示
- `isSuperAdmin` は常に `false` になる
- サイト管理者機能のみ利用可能

### 5.2 ローカルと本番の違い

| 機能 | ローカル | 本番 |
|------|---------|------|
| スーパー管理者 | 有効（`true`） | 無効（`false`） |
| デモモード | 有効 | 有効 |
| 管理設定ページ | アクセス可 | アクセス不可 |

---

## 6. n8n API エンドポイント

本番環境で利用可能な API:

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/n8n/schedules/due` | GET | 実行予定のスケジュール取得 |
| `/api/n8n/schedules/due` | POST | スケジュール実行完了を記録 |
| `/api/n8n/jobs` | POST | 新規ジョブ作成 |
| `/api/n8n/jobs` | GET | ジョブ一覧取得 |
| `/api/n8n/jobs/[jobId]` | PATCH | ジョブステータス更新 |
| `/api/n8n/sites/[siteId]/keywords` | GET | サイトのキーワード取得 |
| `/api/n8n/sites/[siteId]/keywords` | POST | キーワード使用回数更新 |

**認証**: すべてのリクエストに `x-api-key` ヘッダーが必要

---

## 7. トラブルシューティング

### 7.1 ビルドエラー

Firebase Console > App Hosting > Builds でログを確認

### 7.2 環境変数が反映されない

```bash
# 空コミットでリビルドをトリガー
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

### 7.3 GitHub ブランチが認識されない

1. GitHub > Settings > Applications > Firebase
2. Configure でリポジトリへのアクセス権を確認
3. Firebase Console でリフレッシュ

### 7.4 シークレットの確認

Google Cloud Console > Secret Manager で確認:
```
https://console.cloud.google.com/security/secret-manager?project=<project-id>
```

---

## 8. 料金目安

| トラフィック | 月額目安 |
|-------------|---------|
| 〜10,000 アクセス/月 | ほぼ無料 |
| 100,000 アクセス/月 | $5〜15 |
| 1,000,000 アクセス/月 | $50〜100+ |

※ Blaze プラン新規登録時は $300 の無料クレジットあり

---

## 9. 参考リンク

- [Firebase App Hosting ドキュメント](https://firebase.google.com/docs/app-hosting)
- [Firebase App Hosting 料金](https://firebase.google.com/docs/app-hosting/costs)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager)
