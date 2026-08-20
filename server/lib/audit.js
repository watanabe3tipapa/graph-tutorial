var fs = require('fs');
var path = require('path');

var AUDIT_PATH = path.join(__dirname, '..', 'data', 'audit.jsonl');

function appendAudit(entry) {
  try {
    fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('監査ログの追記に失敗:', e.message);
  }
}

function readAudit(limit) {
  if (!fs.existsSync(AUDIT_PATH)) {
    return [];
  }
  var max = Math.max(0, Math.min(parseInt(limit, 10) || 50, 500));
  return fs
    .readFileSync(AUDIT_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .slice(-max)
    .map(function(line) {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { appendAudit: appendAudit, readAudit: readAudit };
