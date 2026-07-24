// In-process background-job runner for post-webhook side-effects — PDF render, email
// send and sheet sync run OFF the webhook's return-200-fast path (§9). Jobs run
// sequentially after the current tick and never throw back into the caller, so a
// failed email can't roll back a committed order.
//
// ponytail: in-process + best-effort, lost on restart/crash. Fine for a single
// Railway instance. Swap for a durable queue (pg-boss, or SheetSyncJob-style rows
// drained by a cron worker) if delivery guarantees or multi-instance ever matter.

type Job = () => Promise<void>;

const queue: { name: string; job: Job }[] = [];
let draining = false;

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    try {
      await next.job();
    } catch (err) {
      console.error(`[jobs] ${next.name} failed:`, err);
    }
  }
  draining = false;
}

/** Enqueue a fire-and-forget side-effect. Returns immediately. */
export function enqueueJob(name: string, job: Job): void {
  queue.push({ name, job });
  void drain();
}
