import Link from "next/link";
import { getPrincipal } from "@/lib/authz";
import { listShowProjects } from "@/lib/showProjects";
import { listShowTemplateSummaries } from "@/lib/showTemplates";
import ShowProjectsManager from "./components/ShowProjectsManager";

export default async function StudioShowProjectsPage() {
  const principal = await getPrincipal();

  if (!principal) {
    return (
      <div className="party-card space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-illuvrse-muted">Studio Shows</p>
        <h1 className="text-3xl font-semibold">Sign in to manage show projects</h1>
        <p className="text-sm text-illuvrse-muted">
          Show projects are scoped to your Studio identity and admin access.
        </p>
        <Link
          href="/api/auth/signin?callbackUrl=/studio/show-projects"
          className="interactive-focus inline-flex rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const [projects, templates] = await Promise.all([listShowProjects(principal), listShowTemplateSummaries(principal)]);

  return (
    <ShowProjectsManager
      initialProjects={projects.map((project) => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString()
      }))}
      initialTemplates={templates.map((template) => ({
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString()
      }))}
      currentUserId={principal.userId}
    />
  );
}
