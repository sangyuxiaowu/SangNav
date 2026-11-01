import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'fake-indexeddb/auto';
import { localDate, readBingWallpaper, refreshBingWallpaper } from './bingWallpaper';

test('Bing wallpaper refreshes only after local midnight and preserves cache until committed', async () => {
  const originalFetch = globalThis.fetch;
  const originalImage = globalThis.Image;
  let downloads = 0;
  let decode: () => Promise<void> = async () => {};
  globalThis.Image = class {
    src = '';
    decode() { return decode(); }
  } as unknown as typeof Image;
  globalThis.fetch = async () => {
    downloads++;
    return new Response(new Blob([`image-${downloads}`], { type: 'image/png' }));
  };
  try {
    const beforeMidnight = new Date(2026, 10, 2, 23, 59, 59);
    assert.equal(localDate(beforeMidnight), '2026-11-02');
    const first = await refreshBingWallpaper(beforeMidnight);
    await refreshBingWallpaper(beforeMidnight);
    assert.equal(downloads, 1);

    let finishDecode!: () => void;
    let decodingStarted!: () => void;
    const started = new Promise<void>(resolve => { decodingStarted = resolve; });
    decode = () => {
      decodingStarted();
      return new Promise<void>(resolve => { finishDecode = resolve; });
    };
    const afterMidnight = new Date(2026, 10, 3, 0, 0, 0);
    const update = refreshBingWallpaper(afterMidnight);
    assert.equal(refreshBingWallpaper(afterMidnight), update);
    await started;
    assert.equal((await readBingWallpaper())?.date, first.date);
    finishDecode();
    const second = await update;
    assert.equal(second.date, '2026-11-03');
    assert.equal(await (await readBingWallpaper())?.blob.text(), 'image-2');
    await refreshBingWallpaper(new Date(2026, 10, 3, 23, 59));
    assert.equal(downloads, 2);

    decode = async () => { throw new Error('Invalid image'); };
    await assert.rejects(refreshBingWallpaper(new Date(2026, 10, 4)), /Invalid image/);
    assert.equal((await readBingWallpaper())?.date, second.date);
    globalThis.fetch = async () => { throw new Error('Offline'); };
    await assert.rejects(refreshBingWallpaper(new Date(2026, 10, 4)), /Offline/);
    assert.equal(await (await readBingWallpaper())?.blob.text(), 'image-2');

    decode = async () => {};
    globalThis.fetch = async () => new Response(new Blob(['recovered']));
    assert.equal((await refreshBingWallpaper(new Date(2026, 10, 4))).date, '2026-11-04');

    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
    try {
      await assert.rejects(refreshBingWallpaper(new Date(2026, 10, 5)), /Storage full/);
      assert.equal((await readBingWallpaper())?.date, '2026-11-04');
      assert.equal(await (await readBingWallpaper())?.blob.text(), 'recovered');
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
  }
});