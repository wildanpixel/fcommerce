import type {
  DashboardSnapshot,
  NewProjectInput,
  ProjectSummary,
  SettingsPayload
} from "../../shared/contracts.js";
import type {
  JobRepository,
  ProjectRepository,
  SettingsRepository
} from "../../domain/repositories.js";

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly jobs: JobRepository,
    private readonly settings: SettingsRepository
  ) {}

  async createProject(input: NewProjectInput): Promise<ProjectSummary> {
    return this.projects.create(input);
  }

  async dashboard(): Promise<DashboardSnapshot> {
    const [projects, jobs] = await Promise.all([this.projects.list(), this.jobs.listRecent(30)]);
    return {
      projects,
      jobs,
      metrics: {
        activeProjects: projects.filter((project) => project.status === "ACTIVE").length,
        completedReports: projects.reduce((sum, project) => sum + project.counts.reports, 0),
        runningJobs: jobs.filter((job) => job.status === "RUNNING").length,
        collectedProducts: projects.reduce((sum, project) => sum + project.counts.products, 0)
      }
    };
  }

  async getSettings(): Promise<SettingsPayload> {
    return this.settings.get();
  }
}
