// src/lib/insights/concurrency.ts
//
// Bounded-concurrency map — used anywhere we fan out one query per edition
// or per user (funnel openers, backfill). Full Promise.all is fine for a
// handful of items, but backfilling many editions at once (each doing its
// own multi-query computation) can open more concurrent DB connections than
// the pool wants; this caps it without falling back to a slow sequential loop.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
