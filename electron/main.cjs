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

ipcMain.handle('fetch-url', async (event, url) => {
  try {
    const response = await nodeFetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    const titleElement = document.querySelector('title');
    const title = titleElement?.textContent || 'No title found';

    return {
      ok: true,
      status: response.status,
      text: html,
      title: title
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      text: '',
      title: 'Error: ' + error.message
    };
  }
});
