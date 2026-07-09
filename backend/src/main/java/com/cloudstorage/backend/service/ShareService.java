package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.entity.FileMetadata;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

public interface ShareService {

    // --- Legacy / Backward Compatibility API (using SharedFile) ---
    ShareDto createShareLink(String username, Long fileId, String password, Integer expiryDays, Integer downloadLimit);
    List<ShareDto> listMyShares(String username);
    void disableShare(String username, Long shareId);
    InputStream getSharedFileStream(String token, String password);
    boolean isPasswordRequired(String token);
    FileMetadata getSharedFileMetadata(String token, String password);

    // --- Enterprise Sharing API (using ShareLink) ---
    ShareLinkDto createShare(String username, CreateShareRequest request);
    ShareLinkDto updateShare(String username, UUID shareId, UpdateShareRequest request);
    void deleteShare(String username, UUID shareId);
    ShareLinkDto getShare(String username, UUID shareId);
    Page<ShareLinkDto> getMyShares(String username, Pageable pageable);
    void revokeShare(String username, UUID shareId);
    void verifySharePassword(UUID shareId, String password);
    SharePreviewDto getSharePreview(String token);
    byte[] generateQrCode(UUID shareId, String format, int width, int height);
    String generateSignedUrl(UUID shareId, long ttlSeconds);
    boolean validateSignedUrl(String token, String expiresAt, String signature);

    // Helper methods for public file downloads and previews
    InputStream downloadSharedFile(String token, String password, String ip, String userAgent, boolean skipPasswordCheck);
    InputStream previewSharedFile(String token, String password, String ip, String userAgent, boolean skipPasswordCheck);
    FileMetadata getSharedFileMetadataByToken(String token);
}
