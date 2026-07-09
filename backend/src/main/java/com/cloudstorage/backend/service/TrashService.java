package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.TrashItemDto;
import java.util.List;

public interface TrashService {
    List<TrashItemDto> listTrash(String username);
    void restoreItem(String username, Long id, boolean isFolder);
    void permanentDeleteItem(String username, Long id, boolean isFolder);
    void bulkRestore(String username, List<Long> fileIds, List<Long> folderIds);
    void bulkPermanentDelete(String username, List<Long> fileIds, List<Long> folderIds);
    void autoCleanup(int retentionDays);
}
