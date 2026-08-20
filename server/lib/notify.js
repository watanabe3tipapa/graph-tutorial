var fs = require('fs');
var path = require('path');

var STATE_PATH = path.join(__dirname, '..', 'data', '.notify-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state));
  } catch (e) {
    console.error('失敗通知の状態保存に失敗:', e.message);
  }
}

// 収集失敗をウェブフックで通知する。
// FAILURE_WEBHOOK_URL が未設定の場合は何もしない。
// 同一コレクタからの通知は FAILURE_NOTIFY_INTERVAL_MINUTES（既定 6h）間クールダウンし、
// 障害が継続しても通知が大量に飛ばないようにする。
function notifyFailure(info) {
  var webhook = process.env.FAILURE_WEBHOOK_URL;
  if (!webhook) {
    return Promise.resolve(null);
  }
  var intervalMin = parseInt(process.env.FAILURE_NOTIFY_INTERVAL_MINUTES, 10) || 360;
  var now = Date.now();
  var state = loadState();
  if (now - (state[info.collector.id] || 0) < intervalMin * 60 * 1000) {
    return Promise.resolve(null);
  }
  state[info.collector.id] = now;
  saveState(state);

  var payload = {
    text: 'コレクタ収集失敗: ' + info.collector.name + ' (' + info.collector.id + ')',
    collector: info.collector.id,
    error: info.error instanceof Error ? info.error.message : String(info.error),
    keptExisting: !!info.existing,
    collectedAt: info.existing && info.existing.collectedAt ? info.existing.collectedAt : null,
    ts: new Date().toISOString()
  };
  return fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function(e) {
    console.error('失敗通知の送信に失敗:', e.message);
  });
}

module.exports = { notifyFailure: notifyFailure };
