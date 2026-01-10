import { getIdToken } from './firebase';

const N8N_WEBHOOK_BASE_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL || '';

export interface RegeneratePayload {
  article_id: string;
  feedback: string;
  user_token: string;
}

export interface N8nResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Trigger article regeneration via n8n webhook
 */
export async function triggerRegeneration(
  articleId: string,
  feedback: string
): Promise<N8nResponse> {
  const token = await getIdToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  if (!N8N_WEBHOOK_BASE_URL) {
    console.warn('N8N_WEBHOOK_BASE_URL is not configured');
    // Return mock success for development
    return {
      success: true,
      message: 'Development mode: Webhook not configured',
    };
  }

  const payload: RegeneratePayload = {
    article_id: articleId,
    feedback,
    user_token: token,
  };

  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE_URL}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Regeneration triggered successfully',
    };
  } catch (error) {
    console.error('Error triggering regeneration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Trigger article publishing to WordPress via n8n webhook
 */
export async function triggerPublish(articleId: string): Promise<N8nResponse> {
  const token = await getIdToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  if (!N8N_WEBHOOK_BASE_URL) {
    console.warn('N8N_WEBHOOK_BASE_URL is not configured');
    return {
      success: true,
      message: 'Development mode: Webhook not configured',
    };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE_URL}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        article_id: articleId,
        user_token: token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Publishing triggered successfully',
    };
  } catch (error) {
    console.error('Error triggering publish:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
