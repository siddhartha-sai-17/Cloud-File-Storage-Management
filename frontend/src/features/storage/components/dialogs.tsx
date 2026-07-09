import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storageService } from '../services/storage.service';
import { type StorageItem } from '../types';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  isLoading: boolean;
}

export function CreateFolderDialog({
  isOpen,
  onOpenChange,
  onCreate,
  isLoading,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder-name" className="text-right">
                Name
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RenameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: StorageItem | null;
  onRename: (id: number, isFolder: boolean, newName: string) => void;
  isLoading: boolean;
}

export function RenameDialog({
  isOpen,
  onOpenChange,
  item,
  onRename,
  isLoading,
}: RenameDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (item) setName(item.name);
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item && name.trim() && name.trim() !== item.name) {
      onRename(item.id, item.type === 'FOLDER', name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>
              Enter a new name for the {item?.type === 'FOLDER' ? 'folder' : 'file'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename-name" className="text-right">
                Name
              </Label>
              <Input
                id="rename-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!(isLoading || !name.trim() || (item && name.trim() === item.name))}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MoveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: StorageItem | null;
  onAction: (id: number, isFolder: boolean, targetFolderId?: number) => void;
  actionType: 'move' | 'copy';
}

export function MoveDialog({
  isOpen,
  onOpenChange,
  item,
  onAction,
  actionType,
}: MoveDialogProps) {
  const [targetId, setTargetId] = useState<string>('root');

  // Load flat folders from root level to select from
  const { data: rootItems = [], isLoading: isLoadingFolders } = useQuery({
    queryKey: ['move-copy-folders'],
    queryFn: () => storageService.listItems(),
    enabled: isOpen,
  });

  const folders = rootItems.filter((i) => i.type === 'FOLDER' && i.id !== item?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      const folderId = targetId === 'root' ? undefined : parseInt(targetId, 10);
      onAction(item.id, item.type === 'FOLDER', folderId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Item</DialogTitle>
            <DialogDescription>
              Select the destination folder for &quot;{item?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="destination-folder">Destination Folder</Label>
              {isLoadingFolders ? (
                <div className="h-10 rounded border animate-pulse bg-muted" />
              ) : (
                <select
                  id="destination-folder"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="root">Root / My Files</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="capitalize">
              {actionType}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
