import { useState, useCallback } from 'react';

export interface FolderBreadcrumb {
  id: number;
  name: string;
}

export function useFolderNavigation() {
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);

  const navigateToFolder = useCallback((id: number | undefined, name?: string) => {
    setCurrentFolderId(id);
    if (id === undefined) {
      setBreadcrumbs([]);
    } else if (name) {
      setBreadcrumbs((prev) => {
        const index = prev.findIndex((b) => b.id === id);
        if (index !== -1) {
          // If folder exists in path, truncate the breadcrumbs up to it
          return prev.slice(0, index + 1);
        } else {
          // Add new folder to breadcrumb stack
          return [...prev, { id, name }];
        }
      });
    }
  }, []);

  const navigateBackToBreadcrumb = useCallback((index: number) => {
    if (index === -1) {
      navigateToFolder(undefined);
    } else {
      const target = breadcrumbs[index];
      navigateToFolder(target.id, target.name);
    }
  }, [breadcrumbs, navigateToFolder]);

  return {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateBackToBreadcrumb,
  };
}
