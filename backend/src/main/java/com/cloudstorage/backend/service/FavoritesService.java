package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.StorageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Map;

public interface FavoritesService {
    void starFile(String username, Long fileId);
    void unstarFile(String username, Long fileId);
    Page<StorageDto.Item> listFavorites(String username, Pageable pageable);
    Map<String, Object> getFavoriteStatistics(String username);
}
