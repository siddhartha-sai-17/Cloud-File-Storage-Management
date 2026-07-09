import { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Save } from 'lucide-react';
import type { SystemConfigDto } from '../services/admin.service';

export function QuotaManager() {
  const { configs, updateConfig, isUpdatingConfig } = useAdmin();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleEdit = (c: SystemConfigDto) => {
    setEditingKey(c.key);
    setEditingValue(c.value);
  };

  const handleSave = async (key: string) => {
    await updateConfig({ key, value: editingValue });
    setEditingKey(null);
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-bold">System Configuration Manager</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Fine-tune global properties, quotas, search indexing, and background process configuration variables.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <th className="p-3">Key</th>
              <th className="p-3">Value</th>
              <th className="p-3">Last Updated</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {configs.map((c) => {
              const isEditing = editingKey === c.key;

              return (
                <tr key={c.key} className="hover:bg-muted/10">
                  <td className="p-3 font-mono text-xs">{c.key}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="max-w-xs h-8 text-xs focus-visible:ring-primary"
                        aria-label={`Edit value for ${c.key}`}
                      />
                    ) : (
                      <span className="text-xs font-medium text-foreground">{c.value}</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSave(c.key)}
                          disabled={isUpdatingConfig}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs px-2"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingKey(null)}
                          className="h-7 text-xs px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(c)}
                        className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
