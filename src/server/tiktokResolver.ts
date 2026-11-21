export interface ResolvedTikTokSignals {
  resolvedUrl: string;
  oembedTitle?: string;
  authorName?: string;
  creatorHandle?: string;
  thumbnailUrl?: string;
  description?: string;
  subtitlesText?: string;
  videoBase64?: string;
  videoMimeType?: string;
  hasRichMetadata: boolean;
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const MAX_VIDEO_BYTES = 18 * 1024 * 1024;

async function fetchTextWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<{ ok: boolean; url: string; setCookie: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = res.ok ? await res.text() : '';
    return {
      ok: res.ok,
      url: res.url,
      setCookie: res.headers.get('set-cookie') || '',
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchVideoWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<{ base64: string; mimeType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const contentType = res.headers.get('content-type') || '';
    const contentLength = Number(res.headers.get('content-length') || 0);
    if (!res.ok || !contentType.includes('video') || contentLength > MAX_VIDEO_BYTES) {
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength <= 1024 || buf.byteLength > MAX_VIDEO_BYTES) {
      return null;
    }
    return {
      base64: buf.toString('base64'),
      mimeType: contentType.split(';')[0] || 'video/mp4',
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractMetaTag(html: string, attrName: string, attrValue: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']*)["'][^>]*>|<meta[^>]+content=["']([^"']*)["'][^>]+${attrName}=["']${attrValue}["'][^>]*>`,
    'i'
  );
  const match = html.match(pattern);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return undefined;
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractUniversalData(html: string): {
  desc?: string;
  authorUniqueId?: string;
  playAddr?: string;
  subtitleUrl?: string;
  coverUrl?: string;
} {
  const match = html.match(
    /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match?.[1]) return {};

  try {
    const json = JSON.parse(match[1]);
    const defaultScope = json?.__DEFAULT_SCOPE__;
    const itemDetail = defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (!itemDetail) return {};

    const desc = typeof itemDetail.desc === 'string' ? itemDetail.desc : undefined;
    const authorUniqueId =
      typeof itemDetail.author?.uniqueId === 'string' ? itemDetail.author.uniqueId : undefined;
    const playAddr =
      itemDetail.video?.playAddr ||
      itemDetail.video?.downloadAddr ||
      itemDetail.video?.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0];
    const coverUrl = itemDetail.video?.cover || itemDetail.video?.originCover;
    const subtitleUrl = itemDetail.video?.subtitleInfos?.find(
      (s: { LanguageCodeName?: string; Url?: string }) =>
        s?.Url && (!s.LanguageCodeName || s.LanguageCodeName.startsWith('eng'))
    )?.Url;

    return {
      desc,
      authorUniqueId,
      playAddr: typeof playAddr === 'string' ? playAddr : undefined,
      subtitleUrl: typeof subtitleUrl === 'string' ? subtitleUrl : undefined,
      coverUrl: typeof coverUrl === 'string' ? coverUrl : undefined,
    };
  } catch {
    return {};
  }
}

export async function resolveTikTokVideo(rawUrl: string): Promise<ResolvedTikTokSignals> {
  let resolvedUrl = rawUrl.trim();
  let html = '';
  let setCookieHeader = '';

  const isShortLink = /^https?:\/\/(vm|vt)\.tiktok\.com\//i.test(resolvedUrl);

  const fetchHtml = async (targetUrl: string) => {
    const page = await fetchTextWithTimeout(
      targetUrl,
      {
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      3500
    );
    if (page.url) {
      resolvedUrl = page.url.split('?')[0] || resolvedUrl;
    }
    setCookieHeader = page.setCookie;
    if (page.ok) {
      html = page.text;
    }
  };

  type OembedPayload = {
    title?: string;
    author_name?: string;
    author_unique_id?: string;
    author_url?: string;
    thumbnail_url?: string;
  };

  const fetchOembed = async (targetUrl: string) => {
    const oembedEndpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
    return fetchJsonWithTimeout<OembedPayload>(
      oembedEndpoint,
      { headers: { 'User-Agent': BROWSER_UA } },
      3500
    );
  };

  let oembedData: OembedPayload | null = null;

  if (isShortLink) {
    try {
      await fetchHtml(resolvedUrl);
    } catch {
      // ignore redirect error
    }
    try {
      oembedData = await fetchOembed(resolvedUrl);
    } catch {
      // ignore oEmbed error
    }
  } else {
    const [htmlResult, oembedResult] = await Promise.allSettled([
      fetchHtml(resolvedUrl),
      fetchOembed(resolvedUrl),
    ]);
    if (htmlResult.status === 'rejected') {
      // HTML optional
    }
    if (oembedResult.status === 'fulfilled') {
      oembedData = oembedResult.value;
    }
  }

  let oembedTitle: string | undefined;
  let authorName: string | undefined;
  let authorHandle: string | undefined;
  let thumbnailUrl: string | undefined;

  if (oembedData) {
    oembedTitle = oembedData.title?.trim() || undefined;
    authorName = oembedData.author_name?.trim() || undefined;
    if (oembedData.author_unique_id) {
      authorHandle = `@${oembedData.author_unique_id.replace(/^@/, '')}`;
    } else if (oembedData.author_url) {
      const handleMatch = oembedData.author_url.match(/\/@([^/?#]+)/);
      if (handleMatch?.[1]) {
        authorHandle = `@${handleMatch[1]}`;
      }
    }
    thumbnailUrl = oembedData.thumbnail_url || undefined;
  }

  const rehydrated = html ? extractUniversalData(html) : {};
  const ogDesc = html ? extractMetaTag(html, 'property', 'og:description') : undefined;
  const metaDesc = html ? extractMetaTag(html, 'name', 'description') : undefined;
  const ogImage = html ? extractMetaTag(html, 'property', 'og:image') : undefined;

  if (!authorHandle && rehydrated.authorUniqueId) {
    authorHandle = `@${rehydrated.authorUniqueId.replace(/^@/, '')}`;
  }
  if (!authorHandle) {
    const urlHandle = resolvedUrl.match(/tiktok\.com\/@([^/?#]+)/i);
    if (urlHandle?.[1]) {
      authorHandle = `@${urlHandle[1]}`;
    }
  }

  if (!thumbnailUrl) {
    thumbnailUrl = rehydrated.coverUrl || ogImage;
  }

  const description = rehydrated.desc || oembedTitle || ogDesc || metaDesc;

  let subtitlesText: string | undefined;
  let videoBase64: string | undefined;
  let videoMimeType: string | undefined;

  const optionalMediaTasks: Array<Promise<void>> = [];

  if (rehydrated.subtitleUrl) {
    optionalMediaTasks.push(
      (async () => {
        try {
          const sub = await fetchTextWithTimeout(
            rehydrated.subtitleUrl!,
            { headers: { 'User-Agent': BROWSER_UA } },
            3000
          );
          if (sub.ok && sub.text) {
            subtitlesText = sub.text
              .replace(/^WEBVTT.*$/gm, '')
              .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm, '')
              .replace(/<[^>]+>/g, '')
              .replace(/\n{2,}/g, '\n')
              .trim();
          }
        } catch {
          // optional
        }
      })()
    );
  }

  if (rehydrated.playAddr) {
    optionalMediaTasks.push(
      (async () => {
        try {
          const vid = await fetchVideoWithTimeout(
            rehydrated.playAddr!,
            {
              headers: {
                'User-Agent': BROWSER_UA,
                Referer: 'https://www.tiktok.com/',
                ...(setCookieHeader ? { Cookie: setCookieHeader } : {}),
              },
            },
            5000
          );
          if (vid) {
            videoBase64 = vid.base64;
            videoMimeType = vid.mimeType;
          }
        } catch {
          // optional
        }
      })()
    );
  }

  if (optionalMediaTasks.length > 0) {
    await Promise.allSettled(optionalMediaTasks);
  }

  const hasRichMetadata = Boolean(videoBase64 || description || subtitlesText || oembedTitle);

  return {
    resolvedUrl,
    oembedTitle,
    authorName,
    creatorHandle: authorHandle || '@tiktokchef',
    thumbnailUrl,
    description,
    subtitlesText,
    videoBase64,
    videoMimeType,
    hasRichMetadata,
  };
}
