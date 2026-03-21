package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.ShareDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.SharedFile;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.SharedFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShareService {

    private final SharedFileRepository sharedFileRepository;
    private final FileRepository fileRepository;
    private final StorageService storageService;

    @Transactional
    public ShareDto createShareLink(String username, Long fileId) {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        if (!file.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        SharedFile sharedFile = new SharedFile();
        sharedFile.setFile(file);
        sharedFile.setToken(token);

        sharedFile = sharedFileRepository.save(sharedFile);

        return mapToDto(sharedFile);
    }

    public List<ShareDto> listMyShares(String username) {
        return sharedFileRepository.findByFile_User_Username(username).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void disableShare(String username, Long shareId) {
        SharedFile sharedFile = sharedFileRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        if (!sharedFile.getFile().getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        sharedFile.setActive(false);
        sharedFileRepository.save(sharedFile);
    }

    public InputStream getSharedFileStream(String token) {
        SharedFile sharedFile = sharedFileRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link invalid"));

        if (!sharedFile.isActive()) {
            throw new RuntimeException("Link expired or disabled");
        }

        // Re-use storage service to get stream, but bypass user check effectively since
        // we validated token
        // We need a method in StorageService that takes fileId directly or just copy
        // logic.
        // Copying logic is safer to avoid creating "admin-like" methods in
        // StorageService if strict there.
        // Actually best to add a method in StorageService: downloadFileInternal(Long
        // fileId)
        return storageService.downloadFileInternal(sharedFile.getFile().getId());
    }

    public FileMetadata getSharedFileMetadata(String token) {
        SharedFile sharedFile = sharedFileRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link invalid"));
        if (!sharedFile.isActive()) {
            throw new RuntimeException("Link expired or disabled");
        }
        return sharedFile.getFile();
    }

    private ShareDto mapToDto(SharedFile sharedFile) {
        // Assuming frontend URL logic will handle full link construction or we return
        // full URL here if we know host
        // We will return relative path or token
        return ShareDto.builder()
                .id(sharedFile.getId())
                .fileId(sharedFile.getFile().getId())
                .fileName(sharedFile.getFile().getFilename())
                .token(sharedFile.getToken())
                .createdAt(sharedFile.getCreatedAt())
                .active(sharedFile.isActive())
                .build();
    }
}
