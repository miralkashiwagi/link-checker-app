const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const nodeFetch = require('node-fetch').default;
const { JSDOM } = require('jsdom');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function getTextAfterAnchor(document, element, dom) {
  console.log('[main] === アンカー要素の詳細 ===');
  console.log('[main] アンカー要素のHTML:', element.outerHTML);
  console.log('[main] アンカー要素のID:', element.id);
  console.log('[main] アンカー要素の親要素:', element.parentNode?.tagName);
  console.log('[main] アンカー要素の親要素のHTML:', element.parentNode?.outerHTML);

  // アンカー要素の周辺の要素を確認
  console.log('[main] === 周辺要素の確認 ===');
  if (element.nextElementSibling) {
    console.log('[main] 次の要素:', {
      tagName: element.nextElementSibling.tagName,
      html: element.nextElementSibling.outerHTML,
      text: element.nextElementSibling.textContent.trim()
    });
  }
  if (element.previousElementSibling) {
    console.log('[main] 前の要素:', {
      tagName: element.previousElementSibling.tagName,
      html: element.previousElementSibling.outerHTML,
      text: element.previousElementSibling.textContent.trim()
    });
  }

  // h2やh3などの見出し要素を探す
  console.log('[main] === 見出し要素の探索 ===');
  let targetElement = element;
  while (targetElement) {
    if (targetElement.tagName && /^H[1-6]$/.test(targetElement.tagName)) {
      console.log('[main] 見出し要素を発見:', {
        tagName: targetElement.tagName,
        html: targetElement.outerHTML,
        text: targetElement.textContent.trim()
      });
      const text = targetElement.textContent.trim().slice(0, 20);
      console.log('[main] 見出し要素のテキスト:', text);
      return text;
    }
    targetElement = targetElement.parentElement;
    if (targetElement) {
      console.log('[main] 親要素を確認:', {
        tagName: targetElement.tagName,
        id: targetElement.id,
        className: targetElement.className
      });
    }
  }

  // 見出しが見つからない場合は、次の要素のテキストを探す
  console.log('[main] === 次の要素の探索 ===');
  let nextElement = element.nextElementSibling;
  let count = 0;
  while (nextElement && count < 3) {
    console.log('[main] 次の要素を確認:', {
      tagName: nextElement.tagName,
      html: nextElement.outerHTML,
      text: nextElement.textContent.trim()
    });
    const style = dom.window.getComputedStyle(nextElement);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
    console.log('[main] 要素の可視性:', isVisible);
    
    if (isVisible) {
      const text = nextElement.textContent.trim();
      if (text) {
        console.log('[main] 次の要素のテキストを発見:', text);
        return text.slice(0, 20);
      }
    }
    nextElement = nextElement.nextElementSibling;
    count++;
  }

  // 親要素の次の要素も確認
  console.log('[main] === 親要素の次の要素を確認 ===');
  if (element.parentElement) {
    console.log('[main] 親要素:', {
      tagName: element.parentElement.tagName,
      html: element.parentElement.outerHTML
    });
    nextElement = element.parentElement.nextElementSibling;
    count = 0;
    while (nextElement && count < 3) {
      console.log('[main] 親の次の要素を確認:', {
        tagName: nextElement.tagName,
        html: nextElement.outerHTML,
        text: nextElement.textContent.trim()
      });
      const style = dom.window.getComputedStyle(nextElement);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      console.log('[main] 要素の可視性:', isVisible);
      
      if (isVisible) {
        const text = nextElement.textContent.trim();
        if (text) {
          console.log('[main] 親要素の次の要素のテキストを発見:', text);
          return text.slice(0, 20);
        }
      }
      nextElement = nextElement.nextElementSibling;
      count++;
    }
  }

  // テキストが見つからない場合は要素自体のテキストを返す
  const elementText = element.textContent.trim();
  console.log('[main] 要素自体のテキストを使用:', elementText);
  return elementText.slice(0, 20);
}

function getBaseUrl(url) {
  const urlObj = new URL(url);
  return urlObj.hash === '' ? url : url.split('#')[0];
}

async function getTitleOrAnchorText(url) {
  try {
    console.log('\n[main] ========================================');
    console.log('[main] ============= URL INFO =================');
    console.log('[main] ========================================');
    console.log(`[main] Original URL: ${url}`);

    const urlObj = new URL(url);
    const protocol = urlObj.protocol.toLowerCase();
    
    // Check for supported protocols early
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${protocol}. Only HTTP(S) protocols are supported.`);
    }

    const baseUrl = getBaseUrl(url);
    const hash = urlObj.hash;
    const isAnchorLink = hash !== '';

    console.log(`[main] Base URL: ${baseUrl}`);
    console.log(`[main] Hash: ${hash}`);
    console.log(`[main] Is Anchor Link: ${isAnchorLink}`);

    const response = await nodeFetch(baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Explicitly set UTF-8 encoding for the response text
    const html = await response.text();
    const dom = new JSDOM(html, { url: baseUrl });
    const document = dom.window.document;

    console.log('\n[main] Page Information:');
    const titleElement = document.querySelector('title');
    const h1Element = document.querySelector('h1');
    
    console.log(`[main] Title element: ${titleElement?.textContent || ''}`);
    console.log(`[main] H1 element: ${h1Element?.textContent || ''}`);

    if (isAnchorLink) {
      console.log('[main] Processing as anchor link');
      const anchorElement = document.querySelector(hash);
      if (!anchorElement) {
        throw new Error(`Anchor element ${hash} not found`);
      }
      const text = getTextAfterAnchor(document, anchorElement, dom);
      console.log(`[main] Text after anchor: ${text}`);
      return text;
    } else {
      console.log('[main] Processing as normal URL');
      const title = titleElement?.textContent || '';
      console.log(`[main] Text from title element: ${title}`);
      return title;
    }
  } catch (error) {
    console.log('\n[main] ========================================');
    console.log('[main] Error occurred:', error);
    console.log('[main] ========================================\n');
    throw error;
  } finally {
    console.log('\n[main] ========================================');
  }
}

ipcMain.handle('fetch-url', async (event, url) => {
  try {
    const titleOrText = await getTitleOrAnchorText(url);
    console.log('\n[main] ========================================');
    console.log('[main] Final text:', titleOrText);
    console.log('[main] ========================================\n');
    return {
      ok: true,
      status: 200,
      text: titleOrText,
      titleOrText: titleOrText || 'No title found'
    };
  } catch (error) {
    console.error('\n[main] ========================================');
    console.error('[main] Error occurred:', error);
    console.error('[main] ========================================\n');
    return {
      ok: false,
      status: 0,
      error: error.message,
      titleOrText: 'Error: ' + error.message
    };
  }
});
