import type { IntelligenceWorkflow } from "./IntelligenceWorkflow.js";
import type { JobRepository, LogRepository } from "../../domain/repositories.js";
import type { CreateJobPayload, JobSummary } from "../../shared/contracts.js";

type QueueEntry = {
  job: JobSummary;
  payload: CreateJobPayload;
};

export class JobQueue {
  private readonly queue: QueueEntry[] = [];
  private running = 0;

  constructor(
    private readonly jobs: JobRepository,
    private readonly workflow: IntelligenceWorkflow,
    private readonly logs: LogRepository,
    private concurrency: number
  ) {}

  setConcurrency(value: number): void {
    this.concurrency = Math.max(1, Math.min(5, value));
    void this.drain();
  }

  async enqueue(payload: CreateJobPayload): Promise<JobSummary> {
    const job = await this.jobs.create(payload);
    this.queue.push({ job, payload });
    await this.logs.write({
      projectId: payload.projectId,
      jobId: job.id,
      level: "INFO",
      message: "Job queued",
      context: { keyword: payload.keyword, marketplace: payload.marketplace }
    });
    void this.drain();
    return job;
  }

  private async drain(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const entry = this.queue.shift();
      if (!entry) {
        return;
      }
      this.running += 1;
      void this.runEntry(entry).finally(() => {
        this.running -= 1;
        void this.drain();
      });
    }
  }

  private async runEntry(entry: QueueEntry): Promise<void> {
    try {
      await this.workflow.run(entry.job.id, entry.payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown job failure";
      await this.jobs.updateStatus(entry.job.id, "FAILED", 100, message);
      await this.logs.write({
        projectId: entry.payload.projectId,
        jobId: entry.job.id,
        level: "ERROR",
        message,
        context: { stack: error instanceof Error ? error.stack : undefined }
      });
    }
  }
}
