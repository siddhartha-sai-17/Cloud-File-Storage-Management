import { FileExplorer } from '@/features/storage/components/FileExplorer';
import { PageHeader } from '@/components/ui/page-header';

export function FilesPage() {
  return (
    <div className="space-y-6 flex flex-col h-full">
      <PageHeader
        title="My Files"
        description="Store, share, and collaborate on your files and folders."
        className="border-none pb-0"
      />
      <div className="flex-1">
        <FileExplorer />
      </div>
    </div>
  );
}

export default FilesPage;
