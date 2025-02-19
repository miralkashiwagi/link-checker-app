const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
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
    // Fix for production build
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
    
    // Enable this to debug file loading issues
    win.webContents.openDevTools();
  }
}

// セッション情報を保持する変数
let sessionCookies = new Map();
let basicAuthCredentials = new Map();
let sessionWindow = null;
let authHandler = null;
let pendingAuthRequests = new Map(); // ホストごとの認証処理待ちのコールバックを保持

function createSessionWindow() {
  sessionWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Basic認証のハンドリング
  sessionWindow.webContents.on('login', async (event, authenticationResponseDetails, authInfo, callback) => {
    event.preventDefault();
    const { host } = new URL(authenticationResponseDetails.url);

    // 既に認証情報がある場合はそれを使用
    const existingAuth = basicAuthCredentials.get(host);
    if (existingAuth) {
      callback(existingAuth.username, existingAuth.password);
      return;
    }

    // 既に認証ウィンドウが開いている場合は、コールバックを待機リストに追加
    if (pendingAuthRequests.has(host)) {
      pendingAuthRequests.get(host).push(callback);
      return;
    }

    // 新しい認証リクエストの開始
    pendingAuthRequests.set(host, [callback]);
    
    // ログインダイアログを表示する新しいウィンドウを作成
    const authWindow = new BrowserWindow({
      width: 400,
      height: 300,
      parent: sessionWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    authWindow.loadFile(path.join(__dirname, 'auth.html'));

    // 前回のハンドラーを削除
    if (authHandler) {
      ipcMain.removeHandler('submit-auth');
    }

    // 新しいハンドラーを登録
    authHandler = (event, { username, password }) => {
      basicAuthCredentials.set(host, { username, password });
      
      // 待機中の全てのコールバックに認証情報を提供
      const callbacks = pendingAuthRequests.get(host) || [];
      callbacks.forEach(cb => cb(username, password));
      pendingAuthRequests.delete(host);
      
      authWindow.close();
    };
    ipcMain.handleOnce('submit-auth', authHandler);

    // キャンセルされた場合
    authWindow.on('closed', () => {
      if (basicAuthCredentials.get(host) === undefined) {
        // キャンセルされた場合、待機中の全てのコールバックをキャンセル
        const callbacks = pendingAuthRequests.get(host) || [];
        callbacks.forEach(cb => cb());
        pendingAuthRequests.delete(host);
      }
      
      // ウィンドウが閉じられたときにもハンドラーを削除
      if (authHandler) {
        ipcMain.removeHandler('submit-auth');
        authHandler = null;
      }
    });
  });

  // セッションのクッキーを監視
  sessionWindow.webContents.session.webRequest.onCompleted((details) => {
    const cookies = sessionWindow.webContents.session.cookies;
    cookies.get({})
      .then((cookiesList) => {
        sessionCookies.set(new URL(details.url).origin, cookiesList);
      });
  });

  // セッションウィンドウが閉じられたときの処理
  sessionWindow.on('closed', () => {
    sessionWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // IPC通信ハンドラーの登録
  ipcMain.handle('start-session-capture', async (event, url) => {
    if (sessionWindow) {
      sessionWindow.close();
    }
    createSessionWindow();
    sessionWindow.loadURL(url || 'about:blank');
    return true;
  });

  ipcMain.handle('fetch-url', async (event, url) => {
    try {
      const urlObj = new URL(url);
      const origin = urlObj.origin;
      const cookies = sessionCookies.get(origin);
      const auth = basicAuthCredentials.get(urlObj.host);
      
      // ヘッダーの構築
      const headers = {};
      
      // クッキーヘッダーを追加
      if (cookies && cookies.length > 0) {
        headers['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
      
      // Basic認証ヘッダーを追加
      if (auth) {
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await nodeFetch(url, {
        redirect: 'follow',
        headers,
        credentials: 'include'
      });
      const html = await response.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;
      const titleElement = document.querySelector('title');
      const title = titleElement?.textContent || 'No title found';

      return {
        ok: response.ok,
        status: response.status,
        text: html,
        title: title,
        redirected: response.redirected,
        redirectUrl: response.url
      };
    } catch (error) {
      let status = 0;
      if (error.name === 'FetchError' && error.code === 'ENOTFOUND') {
        status = 404;
      } else if (error.response) {
        status = error.response.status;
      }

      return {
        ok: false,
        status: status,
        error: error.message,
        text: '',
        title: 'Error: ' + error.message,
        redirected: false,
        redirectUrl: null
      };
    }
  });

  ipcMain.handle('open-in-browser', async (event, url) => {
    await shell.openExternal(url);
    return true;
  });

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
  let nextElement = element.nextElementSibling;
  let text = '';

  while (nextElement && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'DL'].includes(nextElement.tagName)) {
    text += nextElement.textContent + ' ';
    nextElement = nextElement.nextElementSibling;
  }

  if (!text.trim() && element.parentNode) {
    text = element.parentNode.textContent;
  }

  return text.trim();
}

function getBaseUrl(url) {
  const urlObj = new URL(url);
  return urlObj.hash === '' ? url : url.split('#')[0];
}

async function getTitleOrAnchorText(url) {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.toLowerCase();
    
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${protocol}. Only HTTP(S) protocols are supported.`);
    }

    const baseUrl = getBaseUrl(url);
    const hash = urlObj.hash;
    const isAnchorLink = hash !== '';

    const response = await nodeFetch(baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html, { url: baseUrl });
    const document = dom.window.document;

    if (isAnchorLink) {
      const anchorElement = document.querySelector(hash);
      if (!anchorElement) {
        throw new Error(`Anchor element ${hash} not found`);
      }
      const text = getTextAfterAnchor(document, anchorElement, dom);
      return text;
    } else {
      const titleElement = document.querySelector('title');
      const title = titleElement?.textContent || '';
      return title;
    }
  } catch (error) {
    throw error;
  }
}
