import { supabase } from './supabase';
import { isDemoMode } from './firebase';
import type { Article, FeedbackHistoryItem, Json } from '@/types';

// Demo articles for testing
const DEMO_ARTICLES: Record<string, Article[]> = {
  'demo-site-1': [
    {
      id: 'demo-article-1',
      site_id: 'demo-site-1',
      title: '睡眠の質を上げる5つの習慣',
      content_html: `
        <h2>はじめに</h2>
        <p>質の良い睡眠は健康の基盤です。この記事では、科学的根拠に基づいた睡眠改善法をご紹介します。</p>

        <h2>1. 就寝時間を一定にする</h2>
        <p>体内時計を整えるため、毎日同じ時間に寝て同じ時間に起きることが重要です。</p>

        <div class="is-style-memo_box">
          <p><strong>ポイント:</strong> 週末も平日と同じ時間に起きるようにしましょう。</p>
        </div>

        <h2>2. 寝室の環境を整える</h2>
        <p>適切な温度（18-22℃）、暗さ、静けさが質の良い睡眠に繋がります。</p>

        <h3>おすすめのアイテム</h3>
        <ul>
          <li>遮光カーテン</li>
          <li>ホワイトノイズマシン</li>
          <li>アイマスク</li>
        </ul>
      `,
      status: 'review',
      source_data: [
        { title: '睡眠科学研究所', url: 'https://example.com/sleep-research', content: '睡眠の質は体内時計と密接に関係している...' },
        { title: 'WHO睡眠ガイドライン', url: 'https://example.com/who-sleep', content: '成人は1日7-9時間の睡眠が推奨される...' },
      ],
      feedback_history: [
        { text: '導入部分をもう少し具体的にしてください', created_at: '2024-01-08T10:00:00Z' },
      ],
      wp_post_id: null,
      created_at: '2024-01-07T09:00:00Z',
      updated_at: '2024-01-09T14:30:00Z',
    },
    {
      id: 'demo-article-2',
      site_id: 'demo-site-1',
      title: '朝食で摂りたい栄養素TOP10',
      content_html: '<h2>朝食の重要性</h2><p>1日のエネルギーを確保するため、朝食は非常に重要です。</p>',
      status: 'draft',
      source_data: [],
      feedback_history: [],
      wp_post_id: null,
      created_at: '2024-01-08T11:00:00Z',
      updated_at: '2024-01-08T11:00:00Z',
    },
    {
      id: 'demo-article-3',
      site_id: 'demo-site-1',
      title: 'ストレス解消に効く運動法',
      content_html: '<h2>運動とメンタルヘルス</h2><p>適度な運動はストレス軽減に効果的です。</p>',
      status: 'published',
      source_data: [{ title: '運動医学ジャーナル', url: 'https://example.com/exercise' }],
      feedback_history: [],
      wp_post_id: 12345,
      created_at: '2024-01-05T08:00:00Z',
      updated_at: '2024-01-06T16:00:00Z',
    },
  ],
  'demo-site-2': [
    {
      id: 'demo-article-4',
      site_id: 'demo-site-2',
      title: 'シングルモルトの魅力を探る',
      content_html: '<h2>シングルモルトとは</h2><p>一つの蒸留所で作られたモルトウイスキーを指します。</p>',
      status: 'review',
      source_data: [],
      feedback_history: [],
      wp_post_id: null,
      created_at: '2024-01-06T10:00:00Z',
      updated_at: '2024-01-07T12:00:00Z',
    },
  ],
  'demo-site-3': [
    {
      id: 'demo-article-5',
      site_id: 'demo-site-3',
      title: '伊勢神宮参拝ガイド',
      content_html: '<h2>伊勢神宮について</h2><p>日本で最も格式の高い神社の一つです。</p>',
      status: 'published',
      source_data: [],
      feedback_history: [],
      wp_post_id: 67890,
      created_at: '2024-01-03T09:00:00Z',
      updated_at: '2024-01-04T15:00:00Z',
    },
  ],
};

// In-memory storage for demo mode updates
let demoArticlesState: Record<string, Article[]> = JSON.parse(JSON.stringify(DEMO_ARTICLES));

export async function getArticlesBySiteId(siteId: string): Promise<Article[]> {
  if (isDemoMode) {
    return demoArticlesState[siteId] || [];
  }

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }

  return data || [];
}

export async function getArticleById(articleId: string): Promise<Article | null> {
  if (isDemoMode) {
    for (const articles of Object.values(demoArticlesState)) {
      const article = articles.find((a: Article) => a.id === articleId);
      if (article) return article;
    }
    return null;
  }

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching article:', error);
    throw error;
  }

  return data;
}

export async function updateArticleStatus(
  articleId: string,
  status: 'draft' | 'review' | 'published'
): Promise<Article> {
  if (isDemoMode) {
    for (const siteId of Object.keys(demoArticlesState)) {
      const index = demoArticlesState[siteId].findIndex((a: Article) => a.id === articleId);
      if (index !== -1) {
        demoArticlesState[siteId][index] = {
          ...demoArticlesState[siteId][index],
          status,
          updated_at: new Date().toISOString(),
        };
        return demoArticlesState[siteId][index];
      }
    }
    throw new Error('Article not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('articles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', articleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating article status:', error);
    throw error;
  }

  return data as Article;
}

export async function addFeedbackToHistory(
  articleId: string,
  feedback: string
): Promise<Article> {
  const article = await getArticleById(articleId);
  if (!article) {
    throw new Error('Article not found');
  }

  const currentHistory = (article.feedback_history as unknown as FeedbackHistoryItem[]) || [];
  const newHistory: FeedbackHistoryItem[] = [
    ...currentHistory,
    {
      text: feedback,
      created_at: new Date().toISOString(),
    },
  ];

  if (isDemoMode) {
    for (const siteId of Object.keys(demoArticlesState)) {
      const index = demoArticlesState[siteId].findIndex((a: Article) => a.id === articleId);
      if (index !== -1) {
        demoArticlesState[siteId][index] = {
          ...demoArticlesState[siteId][index],
          feedback_history: newHistory as unknown as Json,
          updated_at: new Date().toISOString(),
        };
        return demoArticlesState[siteId][index];
      }
    }
    throw new Error('Article not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('articles')
    .update({
      feedback_history: newHistory,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single();

  if (error) {
    console.error('Error adding feedback to history:', error);
    throw error;
  }

  return data as Article;
}

export async function updateArticleContent(
  articleId: string,
  contentHtml: string
): Promise<Article> {
  if (isDemoMode) {
    for (const siteId of Object.keys(demoArticlesState)) {
      const index = demoArticlesState[siteId].findIndex((a: Article) => a.id === articleId);
      if (index !== -1) {
        demoArticlesState[siteId][index] = {
          ...demoArticlesState[siteId][index],
          content_html: contentHtml,
          updated_at: new Date().toISOString(),
        };
        return demoArticlesState[siteId][index];
      }
    }
    throw new Error('Article not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('articles')
    .update({
      content_html: contentHtml,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating article content:', error);
    throw error;
  }

  return data as Article;
}
