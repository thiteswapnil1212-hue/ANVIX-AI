
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace/Workspace";

interface WorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

function formatProjectName(projectId: string): string {
  return projectId
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export default async function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const { projectId } = await params;

  if (!projectId?.trim()) {
    notFound();
  }

  const projectName = formatProjectName(projectId);

  return <Workspace projectName={projectName} />;
}