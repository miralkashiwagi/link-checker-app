/**
 * 相対URLを絶対URLに変換する
 */
export function toAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    console.error(`[helpers] Error converting to absolute URL: ${href}`, error);
    return '';
  }
}

/**
 * リンクテキストとターゲットテキストの関連性を確認する
 */
export function isLinkTextProper(linkText: string, targetText: string): boolean {
  // 空のテキストは不適切
  if (!linkText.trim() || !targetText.trim()) {
    return false;
  }

  // URLとリンクテキストが一致する場合
  try {
    const urlObj = new URL(linkText);
    if (urlObj.toString() === linkText) {
      return true;
    }
  } catch (error) {
    // URLのパースに失敗した場合は無視して続行
  }

  // テキストの正規化
  const normalizedLinkText = normalizeLinkText(linkText);
  const normalizedTargetText = normalizeTargetText(targetText);

  // 完全一致の場合
  if (normalizedLinkText === normalizedTargetText) {
    return true;
  }

  // ターゲットテキストがリンクテキストを含む場合
  if (normalizedTargetText.includes(normalizedLinkText)) {
    return true;
  }

  // リンクテキストがターゲットテキストを含む場合
  if (normalizedLinkText.includes(normalizedTargetText)) {
    return true;
  }

  // 混合テキストの処理（アルファベットと日本語を分割）
  const splitParts = splitMixedText(normalizedLinkText);
  if (splitParts.length > 1) {
    for (const part of splitParts) {
      // 各部分とターゲットテキストを比較
      if (normalizedTargetText.includes(part) && part.length >= 2) {
        return true;
      }
    }
  }

  return false;
}


/**
 * 文字列の正規化を行う共通関数
 */
function normalizeText(text: string): string {
  return text
    // 全角英数字を半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    // 全角スペースを半角スペースに変換
    .replace(/　/g, ' ')
    // 連続するスペースを単一のスペースに
    .replace(/\s+/g, ' ')
    // 英数字を小文字に統一
    .toLowerCase()
    // 前後の空白を削除
    .trim();
}

/**
 * リンクテキストを正規化する
 * - 末尾の「一覧」「トップ」「TOP」などを除去
 * - 全角/半角の統一
 * - スペースの正規化
 */
function normalizeLinkText(text: string): string {
  // 末尾の特定のワードを除去するパターン
  const suffixPattern = /[\s　]*(一覧|トップ|TOP|[Tt]op|[Ii]ndex)[\s　]*$/;
  
  return normalizeText(text
    .replace(suffixPattern, '') // 末尾の特定ワードを除去
  );
}

/**
 * ターゲットテキスト（ページタイトルなど）を正規化する
 * - 区切り文字以降を除去（「 | 」「 - 」など）
 * - 全角/半角の統一
 * - スペースの正規化
 */
function normalizeTargetText(text: string): string {
  // 区切り文字以降を除去するパターン
  const separatorPattern = /[\s　]*[|\-–—].*$/;
  
  return normalizeText(text
    .replace(separatorPattern, '') // 区切り文字以降を除去
  );
}

/**
 * アルファベットと日本語が混在するテキストを分割する
 * 例: "Newsお知らせ" → ["news", "お知らせ"]
 */
function splitMixedText(text: string): string[] {
  // 日本語とアルファベット/数字の境界にあるパターンを見つける
  const parts: string[] = [];

  // アルファベット部分と非アルファベット部分を分離する正規表現
  const pattern = /([a-z0-9]+)|([^a-z0-9]+)/gi;
  let matches;

  while ((matches = pattern.exec(text)) !== null) {
    if (matches[0]) {
      // 空白を除去して有効なパートのみ追加
      const part = matches[0].trim();
      if (part) {
        parts.push(part.toLowerCase());
      }
    }
  }

  return parts;
}
