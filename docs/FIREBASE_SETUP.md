# Firebase App Hosting セットアップガイド

このドキュメントは、Firebase App Hostingの設定手順をまとめたものです。

## 前提条件

- Firebase プロジェクト: `ai-creative-compass-studio`
- GitHub リポジトリ: `bestsmilejp/ai-creative-compass-studio`
- Blazeプラン（従量課金）への切り替え済み

---

## 1. Firebase Console での設定

### 1.1 App Hosting の有効化

1. [Firebase Console](https://console.firebase.google.com/project/ai-creative-compass-studio) にアクセス
2. 左メニューから **Build > App Hosting** を選択
3. **Get started** をクリック

### 1.2 GitHub 連携

1. **Connect to GitHub** をクリック
2. GitHub アカウントで認証
3. Firebase GitHub App に以下の権限を付与:
   - リポジトリへの読み取りアクセス
   - Webhooks の設定権限

### 1.3 リポジトリ設定

| 設定項目 | 値 |
|---------|-----|
| Repository | `bestsmilejp/ai-creative-compass-studio` |
| Live branch | `main` |
| Root directory | `/` (プロジェクトルート) |

### 1.4 Firebase Web App の選択

- **Select an existing** を選択
- 既存の Web App: `ai-creative-compass-studio` を選択
  - App ID: `1:741518527526:web:da2c649a6316befe93aae7`

### 1.5 リージョン設定

- **Region**: `asia-northeast1` (東京)

---

## 2. 環境変数の設定

Firebase Console > App Hosting > Settings > Environment variables

### 2.1 Public 環境変数（ビルド時に埋め込み）

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDo9Z-802xRuuZN4nFrnaaVmGudLbkJGMQ` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `ai-creative-compass-studio.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `ai-creative-compass-studio` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `ai-creative-compass-studio.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `741518527526` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:741518527526:web:da2c649a6316befe93aae7` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://arxmawrczcqzgizswenn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase Anon Key) |
| `NEXT_PUBLIC_ENABLE_SUPER_ADMIN` | `false` |

### 2.2 Server-side 環境変数（Secrets）

Firebase Console > App Hosting > Settings > Secrets で設定

| シークレット名 | 説明 |
|---------------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `N8N_API_KEY` | n8n API認証キー |

#### シークレットの設定方法（CLI）

```bash
firebase apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY
# プロンプトで値を入力

firebase apphosting:secrets:set N8N_API_KEY
# プロンプトで値を入力
```

---

## 3. 自動デプロイの仕組み

### 3.1 トリガー

- `main` ブランチへのプッシュ → **本番デプロイ**
- Pull Request 作成 → **プレビュー環境作成**

### 3.2 ビルドプロセス

1. GitHub から最新コードを取得
2. `npm install` で依存関係をインストール
3. `npm run build` でNext.jsをビルド
4. Cloud Run にデプロイ

### 3.3 デプロイ URL

- 本番: `https://ai-creative-compass-studio--main-xxxxxx.asia-northeast1.hosted.app`
- プレビュー: `https://ai-creative-compass-studio--pr-XX-xxxxxx.asia-northeast1.hosted.app`

---

## 4. 関連ファイル

プロジェクト内の Firebase 設定ファイル:

| ファイル | 用途 |
|----------|------|
| `firebase.json` | Firebase Hosting 設定 |
| `.firebaserc` | Firebase プロジェクト設定 |
| `apphosting.yaml` | App Hosting 環境設定 |

---

## 5. 本番環境での制限

### 5.1 スーパー管理者機能の無効化

本番環境では `NEXT_PUBLIC_ENABLE_SUPER_ADMIN=false` を設定することで:

- `/dashboard/admin` ページは「管理機能は無効です」と表示
- `isSuperAdmin` は常に `false` になる
- サイト管理者機能のみ利用可能

### 5.2 ローカル開発との違い

| 機能 | ローカル | 本番 |
|------|---------|------|
| スーパー管理者 | 有効 | 無効 |
| デモモード | 有効 | 有効 |
| 管理設定ページ | アクセス可 | アクセス不可 |

---

## 6. トラブルシューティング

### 6.1 ビルドエラー

Firebase Console > App Hosting > Builds でログを確認

### 6.2 環境変数が反映されない

1. Firebase Console で環境変数を確認
2. 新しいデプロイをトリガー（空コミットでも可）:
   ```bash
   git commit --allow-empty -m "Trigger rebuild"
   git push origin main
   ```

### 6.3 GitHub ブランチが認識されない

1. GitHub > Settings > Applications > Firebase
2. Configure でリポジトリへのアクセス権を確認
3. Firebase Console でリフレッシュ

---

## 7. 料金目安

| トラフィック | 月額目安 |
|-------------|---------|
| 〜10,000 アクセス/月 | ほぼ無料 |
| 100,000 アクセス/月 | $5〜15 |
| 1,000,000 アクセス/月 | $50〜100+ |

※ Blazeプラン新規登録時は $300 の無料クレジットあり

---

## 8. 参考リンク

- [Firebase App Hosting ドキュメント](https://firebase.google.com/docs/app-hosting)
- [Firebase App Hosting 料金](https://firebase.google.com/docs/app-hosting/costs)
- [Firebase Console](https://console.firebase.google.com/project/ai-creative-compass-studio)
- [GitHub リポジトリ](https://github.com/bestsmilejp/ai-creative-compass-studio)
