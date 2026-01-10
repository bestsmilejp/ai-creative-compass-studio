// WordPress REST API client

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'future';
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
}

export interface WPPostsResponse {
  posts: WPPost[];
  total: number;
  totalPages: number;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WordPressCredentials {
  wpUrl: string;
  username?: string;
  appPassword?: string;
}

// Build authorization header for WordPress REST API
function buildAuthHeader(credentials: WordPressCredentials): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (credentials.username && credentials.appPassword) {
    const auth = Buffer.from(`${credentials.username}:${credentials.appPassword}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  return headers;
}

// Normalize WordPress URL
function normalizeWpUrl(url: string): string {
  let normalized = url.trim();

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  if (!normalized.endsWith('/')) {
    normalized += '/';
  }
  return normalized;
}

// Fetch posts from WordPress
export async function fetchWPPosts(
  credentials: WordPressCredentials,
  options: {
    page?: number;
    perPage?: number;
    status?: string;
    search?: string;
    categories?: number[];
    orderby?: 'date' | 'modified' | 'title';
    order?: 'asc' | 'desc';
  } = {}
): Promise<WPPostsResponse> {
  const {
    page = 1,
    perPage = 20,
    status = 'any',
    search,
    categories,
    orderby = 'modified',
    order = 'desc',
  } = options;

  const baseUrl = normalizeWpUrl(credentials.wpUrl);
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    status,
    orderby,
    order,
    _embed: '1', // Include embedded data (featured image, author, etc.)
  });

  if (search) {
    params.set('search', search);
  }

  if (categories && categories.length > 0) {
    params.set('categories', categories.join(','));
  }

  const url = `${baseUrl}wp-json/wp/v2/posts?${params.toString()}`;
  const headers = buildAuthHeader(credentials);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  const posts = await response.json();
  const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0', 10);

  return { posts, total, totalPages };
}

// Fetch a single post by ID
export async function fetchWPPost(
  credentials: WordPressCredentials,
  postId: number
): Promise<WPPost> {
  const baseUrl = normalizeWpUrl(credentials.wpUrl);
  const url = `${baseUrl}wp-json/wp/v2/posts/${postId}?_embed=1`;
  const headers = buildAuthHeader(credentials);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Fetch categories from WordPress
export async function fetchWPCategories(
  credentials: WordPressCredentials
): Promise<WPCategory[]> {
  const baseUrl = normalizeWpUrl(credentials.wpUrl);
  const url = `${baseUrl}wp-json/wp/v2/categories?per_page=100`;
  const headers = buildAuthHeader(credentials);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Fetch tags from WordPress
export async function fetchWPTags(
  credentials: WordPressCredentials
): Promise<WPTag[]> {
  const baseUrl = normalizeWpUrl(credentials.wpUrl);
  const url = `${baseUrl}wp-json/wp/v2/tags?per_page=100`;
  const headers = buildAuthHeader(credentials);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Test WordPress connection
export async function testWPConnection(
  credentials: WordPressCredentials
): Promise<{ success: boolean; message: string; siteInfo?: { name: string; url: string } }> {
  try {
    const baseUrl = normalizeWpUrl(credentials.wpUrl);
    const url = `${baseUrl}wp-json/`;
    const headers = buildAuthHeader(credentials);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return {
        success: false,
        message: `接続に失敗しました: ${response.status}`,
      };
    }

    const data = await response.json();

    // Test authentication by trying to access posts
    if (credentials.username && credentials.appPassword) {
      const postsUrl = `${baseUrl}wp-json/wp/v2/posts?per_page=1&status=any`;
      const postsResponse = await fetch(postsUrl, { headers });

      if (!postsResponse.ok) {
        return {
          success: false,
          message: '認証に失敗しました。ユーザー名とアプリケーションパスワードを確認してください。',
        };
      }
    }

    return {
      success: true,
      message: '接続成功',
      siteInfo: {
        name: data.name || 'Unknown',
        url: data.url || credentials.wpUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
