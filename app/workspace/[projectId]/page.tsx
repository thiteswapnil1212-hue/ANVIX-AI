import Workspace from "@/components/workspace/Workspace";

interface WorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const { projectId } = await params;

  const projectName = projectId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return <Workspace projectName={projectName} />;
}