const assert = require('node:assert/strict');
const { extractTabs, shouldRemind } = require('../modules/announcements.js');
const fixture = `DOCS_modelChunk = ${JSON.stringify({ chunk: [
  { ty: 'mkch', d: [[1, 'First']] },
  { ty: 'ac', d: ['t.abc123', [1, 'Second'], [1]] }
] })}; DOCS_modelChunkLoadStart`;
assert.deepEqual(extractTabs(fixture), [{ id: 't.0', title: 'First' }, { id: 't.abc123', title: 'Second' }]);
assert.deepEqual(extractTabs(fixture + fixture), [{ id: 't.0', title: 'First' }, { id: 't.abc123', title: 'Second' }]);
const deletedFirst = `DOCS_modelChunk = ${JSON.stringify({chunk:[{ty:'mkch',d:[[1,'-']]},{ty:'ac',d:['t.abc123',[1,'Second'],[1]]},{ty:'dc',d:['',[0],0]}]})}; DOCS_modelChunkLoadStart`;
assert.deepEqual(extractTabs(deletedFirst), [{ id: 't.abc123', title: 'Second' }]);
const deletedOther = `DOCS_modelChunk = ${JSON.stringify({chunk:[{ty:'mkch',d:[[1,'First']]},{ty:'ac',d:['t.abc123',[1,'Second'],[1]]},{ty:'dc',d:['t.abc123',[0],0]}]})}; DOCS_modelChunkLoadStart`;
assert.deepEqual(extractTabs(deletedOther), [{ id: 't.0', title: 'First' }]);
assert.throws(() => extractTabs('unrecognised document'), /Unable to identify/);
assert.throws(() => extractTabs('DOCS_modelChunk = {bad}; DOCS_modelChunkLoadStart'), /Unable to identify/);
const tabs = [{ id: 't.0' }], interval = 5 * 60 * 60 * 1000, seenAt = 100000;
assert.equal(shouldRemind(tabs, [], 0, seenAt), true);
assert.equal(shouldRemind(tabs, ['t.0'], seenAt, seenAt + interval - 1), false);
assert.equal(shouldRemind(tabs, ['t.0'], seenAt, seenAt + interval), true);
assert.equal(shouldRemind([...tabs, { id: 't.new' }], ['t.0'], seenAt, seenAt + 1), true);
assert.equal(shouldRemind([], [], 0, seenAt), false);
console.log('Announcements tab parsing tests passed.');
