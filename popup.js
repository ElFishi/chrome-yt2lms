const debug = false; // keeps popup from closing

// ─── Storage ────────────────────────────────────────────────────────────────

async function getSavedLMSServer() {
  return new Promise(resolve => {
    chrome.storage.local.get('lmsServer', data => resolve(data.lmsServer ?? null));
  });
}

async function saveLMSServer(url) {
  return new Promise(resolve => {
    chrome.storage.local.set({ lmsServer: url }, resolve);
  });
}

async function clearSavedLMSServer() {
  return new Promise(resolve => {
    chrome.storage.local.remove('lmsServer', resolve);
  });
}

// ─── LMS API ─────────────────────────────────────────────────────────────────

async function testLMSServer(url) {
  const normalized = url.endsWith('/') ? url : url + '/';
  const response = await fetch(`${normalized}jsonrpc.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'slim.request', params: ['', ['player', 'count', '?']] }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.result?._count === undefined) throw new Error('Unexpected LMS response');
  return normalized;
}

async function fetchPlayers(lmsUrl) {
  const endpoint = `${lmsUrl}jsonrpc.js`;

  const countResp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'slim.request', params: ['', ['player', 'count', '?']] }),
  });
  const { result: { _count: count } } = await countResp.json();

  const playersResp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'slim.request', params: ['', ['players', 'count', count]] }),
  });
  const playersData = await playersResp.json();
  return playersData.result.players_loop.map(p => ({ name: p.name, playerid: p.playerid }));
}

async function sendToLMS(lmsUrl, action, playerId, ytParams) {
  const selected = document.querySelector('input[type=radio][name=ytType]:checked')?.value;
  let ytUrl;

  if (selected === 'song') {
    ytUrl = `youtube://${ytParams.get('v')}`;
  } else if (selected === 'list') {
    ytUrl = `ytplaylist://playlistId=${ytParams.get('list')}`;
  } else {
    return;
  }

  const response = await fetch(`${lmsUrl}jsonrpc.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      method: 'slim.request',
      params: [playerId, ['playlist', action, ytUrl]],
    }),
  });
  if (!response.ok) throw new Error(`LMS error: ${response.statusText}`);
  if (!debug) window.close();
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function isYouTubePage(url) {
  return /youtube/.test(url);
}

function extractYouTubeParams(url) {
  return new URLSearchParams(new URL(url).search);
}

// ─── UI: Config ───────────────────────────────────────────────────────────────

function showConfig(prefill = '') {
  document.getElementById('configSection').classList.remove('d-none');
  document.getElementById('noMusic').classList.add('d-none');
  document.getElementById('sendMusic').classList.add('d-none');
  document.getElementById('lmsInput').value = prefill;
  setConfigStatus('');
}

function setConfigStatus(msg, isError = false) {
  const el = document.getElementById('configStatus');
  el.textContent = msg;
  el.className = 'config-status' + (isError ? ' config-status--error' : ' config-status--ok');
}

// ─── UI: Music interface ──────────────────────────────────────────────────────

function showNoMusic() {
  document.getElementById('noMusic').classList.remove('d-none');
  document.getElementById('sendMusic').classList.add('d-none');
  document.getElementById('configSection').classList.add('d-none');
}

function showError(msg) {
  const existing = document.getElementById('inlineError');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'inlineError';
  div.className = 'error-msg';
  div.textContent = msg;
  document.body.insertBefore(div, document.body.firstChild);
}

function renderPlayerList(lmsUrl, players, ytParams) {
  if (ytParams.has('v')) {
    document.querySelector('label[for="song"]').classList.remove('d-none');
    document.getElementById('song').checked = true;
  }
  if (ytParams.has('list')) {
    document.querySelector('label[for="list"]').classList.remove('d-none');
    document.getElementById('list').checked = true;
  }

  document.getElementById('sendMusic').classList.remove('d-none');
  document.getElementById('configSection').classList.add('d-none');

  const playerList = document.getElementById('playerList');
  // Remove all player entries, keeping only the Download item
  playerList.querySelectorAll('li:not(#download)').forEach(li => li.remove());
  const ns = 'http://www.w3.org/2000/svg';

  const makeSvgIcon = (iconId, extraClass) => {
    const svg = document.createElementNS(ns, 'svg');
    if (extraClass) svg.classList.add(extraClass);
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `icons.svg#${iconId}`);
    svg.appendChild(use);
    return svg;
  };

  players.forEach(player => {
    const li = document.createElement('li');
    li.id = player.playerid;

    li.appendChild(makeSvgIcon('i-player'));

    const nameDiv = document.createElement('div');
    nameDiv.className = 'playerName';
    nameDiv.textContent = player.name;
    li.appendChild(nameDiv);

    for (const [iconId, action] of [['i-play', 'play'], ['i-add', 'add']]) {
      const svg = makeSvgIcon(iconId, 'cmd');
      svg.addEventListener('click', async () => {
        try {
          await sendToLMS(lmsUrl, action, player.playerid, ytParams);
        } catch (err) {
          console.error('Send to LMS failed:', err);
          showError('Failed to reach player. Is LMS still available?');
        }
      });
      li.appendChild(svg);
    }

    playerList.appendChild(li);
  });
}

// ─── Download item ────────────────────────────────────────────────────────────

async function downloadViaLMS(lmsUrl, ytParams) {
  const selected = document.querySelector('input[type=radio][name=ytType]:checked')?.value;
  let ytUrl;

  if (selected === 'song') {
    ytUrl = `youtube://${ytParams.get('v')}`;
  } else if (selected === 'list') {
    ytUrl = `ytplaylist://playlistId=${ytParams.get('list')}`;
  } else {
    return;
  }

  const response = await fetch(`${lmsUrl}jsonrpc.js`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      method: 'slim.request',
      params: ['', ['youtube', 'download', `url:${ytUrl}`]],
    }),
  });

  if (!response.ok) throw new Error(`LMS error: ${response.statusText}`);

  // Open the download log in a new tab so the user can watch progress.
  chrome.tabs.create({ url: `${lmsUrl}plugins/YouTubeDL/downloadlog.html` });
}

function initDownload(lmsUrl, ytParams) {
  const download = document.getElementById('download');
  // Replace any previous listener by cloning the node.
  const fresh = download.cloneNode(true);
  download.parentNode.replaceChild(fresh, download);

  fresh.addEventListener('click', async () => {
    try {
      await downloadViaLMS(lmsUrl, ytParams);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to start download. Is the YouTubeDL plugin installed?');
    }
  });
}

// ─── Initialization ───────────────────────────────────────────────────────────

async function initialize(knownLmsUrl = null) {
  let lmsUrl = knownLmsUrl ?? await getSavedLMSServer();

  if (!lmsUrl) {
    showConfig();
    return;
  }

  let players;
  try {
    lmsUrl = await testLMSServer(lmsUrl);
    players = await fetchPlayers(lmsUrl);
  } catch {
    showConfig(lmsUrl);
    setConfigStatus('Saved LMS is unreachable. Please update the URL.', true);
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!isYouTubePage(tab.url)) { showNoMusic(); return; }
    const ytParams = extractYouTubeParams(tab.url);
    if (!ytParams.has('v') && !ytParams.has('list')) { showNoMusic(); return; }

    initDownload(lmsUrl, ytParams);
    renderPlayerList(lmsUrl, players, ytParams);
  });
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!debug) {
    document.addEventListener('mouseleave', () => {
      if (!document.getElementById('configSection').classList.contains('d-none')) return;
      window.close();
    });
  }

  document.getElementById('btnTest').addEventListener('click', async () => {
    const raw = document.getElementById('lmsInput').value.trim();
    if (!raw) { setConfigStatus('Please enter a URL.', true); return; }
    setConfigStatus('Testing…');
    try {
      await testLMSServer(raw);
      setConfigStatus('Connected ✓');
    } catch {
      setConfigStatus('Cannot reach LMS at that address.', true);
    }
  });

  document.getElementById('btnSave').addEventListener('click', async () => {
    const raw = document.getElementById('lmsInput').value.trim();
    if (!raw) { setConfigStatus('Please enter a URL.', true); return; }
    setConfigStatus('Testing…');
    try {
      const normalized = await testLMSServer(raw);
      await saveLMSServer(normalized);
      setConfigStatus('Saved ✓');
      await initialize(normalized);
    } catch {
      setConfigStatus('Cannot reach LMS — URL not saved.', true);
    }
  });

  document.getElementById('btnReconfig').addEventListener('click', async () => {
    const saved = await getSavedLMSServer();
    await clearSavedLMSServer();
    showConfig(saved ?? '');
  });

  await initialize();
});