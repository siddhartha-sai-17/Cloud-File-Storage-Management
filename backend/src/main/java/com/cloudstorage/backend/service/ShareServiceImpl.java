package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.*;
import com.google.zxing.BarcodeFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShareServiceImpl implements ShareService {

    private final ShareLinkRepository shareLinkRepository;
    private final SharedUserRepository sharedUserRepository;
    private final ShareAccessLogRepository accessLogRepository;
    private final FileRepository fileRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final SharedFileRepository sharedFileRepository; // Legacy support
    private final StorageService storageService;
    private final PasswordEncoder passwordEncoder;
    private final ShareValidationService validationService;
    private final ShareAnalyticsService analyticsService;
    private final AuditService auditService;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    private static final byte[] HMAC_SECRET_KEY = new byte[32];
    private static final SecureRandom secureRandom = new SecureRandom();

    static {
        secureRandom.nextBytes(HMAC_SECRET_KEY);
    }

    // --- Legacy / Backward Compatibility API Implementation ---

    @Override
    @Transactional
    public ShareDto createShareLink(String username, Long fileId, String password, Integer expiryDays, Integer downloadLimit) {
        FileMetadata file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        if (!file.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }
        if (file.isDeleted()) {
            throw new RuntimeException("Cannot share a deleted file");
        }

        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        SharedFile sharedFile = new SharedFile();
        sharedFile.setFile(file);
        sharedFile.setToken(token);

        if (password != null && !password.trim().isEmpty()) {
            sharedFile.setPasswordHash(passwordEncoder.encode(password));
        }
        if (expiryDays != null) {
            sharedFile.setExpiresAt(LocalDateTime.now().plusDays(expiryDays));
        }
        if (downloadLimit != null && downloadLimit > 0) {
            sharedFile.setDownloadLimit(downloadLimit);
        }

        sharedFile = sharedFileRepository.save(sharedFile);

        // Audit legacy share creation
        User user = userRepository.findByUsername(username).orElse(null);
        auditService.logEvent(
                file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                user != null ? user.getId() : null,
                username,
                AuditEventType.SHARE_CREATED,
                EntityType.FILE,
                file.getId(),
                "Created legacy share link for file: " + file.getFilename(),
                "SUCCESS",
                AuditMetadata.builder().build()
        );

        return ShareDto.builder()
                .id(sharedFile.getId())
                .fileId(sharedFile.getFile().getId())
                .fileName(sharedFile.getFile().getFilename())
                .token(sharedFile.getToken())
                .createdAt(sharedFile.getCreatedAt())
                .expiresAt(sharedFile.getExpiresAt())
                .downloadLimit(sharedFile.getDownloadLimit())
                .downloadCount(sharedFile.getDownloadCount())
                .active(sharedFile.isActive())
                .build();
    }

    @Override
    public List<ShareDto> listMyShares(String username) {
        return sharedFileRepository.findByFile_User_Username(username).stream()
                .map(sf -> ShareDto.builder()
                        .id(sf.getId())
                        .fileId(sf.getFile().getId())
                        .fileName(sf.getFile().getFilename())
                        .token(sf.getToken())
                        .createdAt(sf.getCreatedAt())
                        .expiresAt(sf.getExpiresAt())
                        .downloadLimit(sf.getDownloadLimit())
                        .downloadCount(sf.getDownloadCount())
                        .active(sf.isActive())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void disableShare(String username, Long shareId) {
        SharedFile sharedFile = sharedFileRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        if (!sharedFile.getFile().getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        sharedFile.setActive(false);
        sharedFileRepository.save(sharedFile);

        // Audit legacy share deactivation
        User user = userRepository.findByUsername(username).orElse(null);
        auditService.logEvent(
                sharedFile.getFile().getWorkspace() != null ? sharedFile.getFile().getWorkspace().getId() : null,
                user != null ? user.getId() : null,
                username,
                AuditEventType.SHARE_REVOKED,
                EntityType.FILE,
                sharedFile.getFile().getId(),
                "Disabled legacy share link for file: " + sharedFile.getFile().getFilename(),
                "SUCCESS",
                AuditMetadata.builder().build()
        );
    }

    @Override
    @Transactional
    public InputStream getSharedFileStream(String token, String password) {
        SharedFile sharedFile = sharedFileRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link invalid"));

        if (!sharedFile.isActive()) {
            throw new RuntimeException("Link expired or disabled");
        }

        if (sharedFile.getExpiresAt() != null && sharedFile.getExpiresAt().isBefore(LocalDateTime.now())) {
            sharedFile.setActive(false);
            sharedFileRepository.save(sharedFile);
            throw new RuntimeException("Link expired");
        }

        if (sharedFile.getDownloadLimit() != null && sharedFile.getDownloadCount() >= sharedFile.getDownloadLimit()) {
            sharedFile.setActive(false);
            sharedFileRepository.save(sharedFile);
            throw new RuntimeException("Download limit reached");
        }

        if (sharedFile.getPasswordHash() != null) {
            if (password == null || !passwordEncoder.matches(password, sharedFile.getPasswordHash())) {
                throw new RuntimeException("Password required or invalid");
            }
        }

        // Increment download count
        sharedFile.setDownloadCount(sharedFile.getDownloadCount() + 1);
        sharedFileRepository.save(sharedFile);

        return storageService.downloadFileInternal(sharedFile.getFile().getId());
    }

    @Override
    public boolean isPasswordRequired(String token) {
        SharedFile sharedFile = sharedFileRepository.findByToken(token).orElse(null);
        if (sharedFile != null) {
            return sharedFile.isActive() && sharedFile.getPasswordHash() != null;
        }
        ShareLink shareLink = shareLinkRepository.findByToken(token).orElse(null);
        if (shareLink != null) {
            return shareLink.isActive() && shareLink.getPasswordHash() != null;
        }
        return false;
    }

    @Override
    public FileMetadata getSharedFileMetadata(String token, String password) {
        SharedFile sharedFile = sharedFileRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link invalid"));
        if (!sharedFile.isActive()) {
            throw new RuntimeException("Link expired or disabled");
        }
        if (sharedFile.getExpiresAt() != null && sharedFile.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Link expired");
        }
        if (sharedFile.getDownloadLimit() != null && sharedFile.getDownloadCount() >= sharedFile.getDownloadLimit()) {
            throw new RuntimeException("Download limit reached");
        }
        if (sharedFile.getPasswordHash() != null) {
            if (password == null || !passwordEncoder.matches(password, sharedFile.getPasswordHash())) {
                throw new RuntimeException("Password required or invalid");
            }
        }
        return sharedFile.getFile();
    }


    // --- Enterprise Sharing API Implementation ---

    @Override
    @Transactional
    public ShareLinkDto createShare(String username, CreateShareRequest request) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("Creator user not found"));

        ShareLink.ShareLinkBuilder builder = ShareLink.builder()
                .createdBy(creator)
                .shareType(ShareType.valueOf(request.getShareType().toUpperCase()))
                .permission(PermissionLevel.valueOf(request.getPermission().toUpperCase()))
                .active(true)
                .expiresAt(request.getExpiresAt())
                .downloadLimit(request.getDownloadLimit())
                .viewLimit(request.getViewLimit())
                .allowPreview(request.getAllowPreview() != null ? request.getAllowPreview() : true)
                .allowDownload(request.getAllowDownload() != null ? request.getAllowDownload() : true)
                .allowUpload(request.getAllowUpload() != null ? request.getAllowUpload() : false)
                .allowReshare(request.getAllowReshare() != null ? request.getAllowReshare() : false);

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            builder.passwordHash(passwordEncoder.encode(request.getPassword()));
        }

        FileMetadata file = null;
        Workspace workspace = null;

        if (request.getFileId() != null) {
            file = fileRepository.findById(request.getFileId())
                    .orElseThrow(() -> new RuntimeException("File not found"));
            // Permission check: creator must own the file or have MANAGE permission on workspace
            if (!file.getUser().getUsername().equals(username)) {
                if (file.getWorkspace() != null) {
                    boolean isManager = workspaceMemberRepository.existsByWorkspaceAndUserAndStatus(
                            file.getWorkspace(), creator, WorkspaceMemberStatus.ACTIVE);
                    if (!isManager) {
                        throw new PermissionDeniedException("Unauthorized to share this file");
                    }
                } else {
                    throw new PermissionDeniedException("Unauthorized to share this file");
                }
            }
            builder.fileMetadata(file);
        } else if (request.getWorkspaceId() != null) {
            workspace = workspaceRepository.findById(request.getWorkspaceId())
                    .orElseThrow(() -> new RuntimeException("Workspace not found"));
            // Permission check: creator must be workspace admin or owner
            WorkspaceMember membership = workspaceMemberRepository.findByWorkspaceAndUser(workspace, creator)
                    .orElseThrow(() -> new PermissionDeniedException("Not a member of the workspace"));
            if (membership.getRole() != WorkspaceRole.MANAGER && !workspace.getOwner().getId().equals(creator.getId()) && membership.getRole() != WorkspaceRole.WORKSPACE_OWNER) {
                throw new PermissionDeniedException("Only admins can share the workspace");
            }
            builder.workspace(workspace);
        } else {
            throw new IllegalArgumentException("Either fileId or workspaceId must be provided");
        }

        // Generate cryptographically secure random token (256-bit entropy encoded in base64)
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        builder.token(token);

        ShareLink shareLink = shareLinkRepository.save(builder.build());

        // Process private/internal target users
        if (request.getTargetUsernames() != null && !request.getTargetUsernames().isEmpty()) {
            for (String targetUser : request.getTargetUsernames()) {
                User user = userRepository.findByUsername(targetUser).orElse(null);
                if (user != null) {
                    SharedUser sharedUser = SharedUser.builder()
                            .shareLink(shareLink)
                            .user(user)
                            .permission(shareLink.getPermission())
                            .accepted(false)
                            .build();
                    sharedUserRepository.save(sharedUser);
                }
            }
        }

        // Log audit event
        auditService.logEvent(
                workspace != null ? workspace.getId() : (file != null && file.getWorkspace() != null ? file.getWorkspace().getId() : null),
                creator.getId(),
                username,
                AuditEventType.SHARE_CREATED,
                EntityType.SHARE_LINK,
                null,
                "Created share link of type: " + shareLink.getShareType(),
                "SUCCESS",
                AuditMetadata.builder().build()
        );

        return mapToDto(shareLink);
    }

    @Override
    @Transactional
    public ShareLinkDto updateShare(String username, UUID shareId, UpdateShareRequest request) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));

        if (!shareLink.getCreatedBy().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new PermissionDeniedException("Unauthorized to update this share link");
        }

        if (request.getPermission() != null) {
            shareLink.setPermission(PermissionLevel.valueOf(request.getPermission().toUpperCase()));
        }
        if (request.getPassword() != null) {
            if (request.getPassword().trim().isEmpty()) {
                shareLink.setPasswordHash(null);
            } else {
                shareLink.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            }
        }
        if (request.getExpiresAt() != null) {
            shareLink.setExpiresAt(request.getExpiresAt());
        }
        if (request.getDownloadLimit() != null) {
            shareLink.setDownloadLimit(request.getDownloadLimit());
        }
        if (request.getViewLimit() != null) {
            shareLink.setViewLimit(request.getViewLimit());
        }
        if (request.getAllowPreview() != null) {
            shareLink.setAllowPreview(request.getAllowPreview());
        }
        if (request.getAllowDownload() != null) {
            shareLink.setAllowDownload(request.getAllowDownload());
        }
        if (request.getAllowUpload() != null) {
            shareLink.setAllowUpload(request.getAllowUpload());
        }
        if (request.getAllowReshare() != null) {
            shareLink.setAllowReshare(request.getAllowReshare());
        }
        if (request.getActive() != null) {
            shareLink.setActive(request.getActive());
        }

        shareLink = shareLinkRepository.save(shareLink);

        auditService.logEvent(
                shareLink.getWorkspace() != null ? shareLink.getWorkspace().getId() : (shareLink.getFileMetadata() != null && shareLink.getFileMetadata().getWorkspace() != null ? shareLink.getFileMetadata().getWorkspace().getId() : null),
                user.getId(),
                username,
                AuditEventType.SHARE_UPDATED,
                EntityType.SHARE_LINK,
                null,
                "Updated share link parameters",
                "SUCCESS",
                AuditMetadata.builder().build()
        );

        return mapToDto(shareLink);
    }

    @Override
    @Transactional
    public void deleteShare(String username, UUID shareId) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));

        if (!shareLink.getCreatedBy().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new PermissionDeniedException("Unauthorized to delete this share link");
        }

        sharedUserRepository.deleteByShareLinkId(shareId);
        shareLinkRepository.delete(shareLink);

        auditService.logEvent(
                shareLink.getWorkspace() != null ? shareLink.getWorkspace().getId() : (shareLink.getFileMetadata() != null && shareLink.getFileMetadata().getWorkspace() != null ? shareLink.getFileMetadata().getWorkspace().getId() : null),
                user.getId(),
                username,
                AuditEventType.SHARE_DELETED,
                EntityType.SHARE_LINK,
                null,
                "Deleted share link",
                "SUCCESS",
                AuditMetadata.builder().build()
        );
    }

    @Override
    public ShareLinkDto getShare(String username, UUID shareId) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));

        if (!shareLink.getCreatedBy().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new PermissionDeniedException("Unauthorized to view this share link");
        }

        return mapToDto(shareLink);
    }

    @Override
    public Page<ShareLinkDto> getMyShares(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));
        return shareLinkRepository.findByCreatedBy(user, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional
    public void revokeShare(String username, UUID shareId) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found"));

        if (!shareLink.getCreatedBy().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new PermissionDeniedException("Unauthorized to revoke this share link");
        }

        shareLink.setActive(false);
        shareLinkRepository.save(shareLink);

        auditService.logEvent(
                shareLink.getWorkspace() != null ? shareLink.getWorkspace().getId() : (shareLink.getFileMetadata() != null && shareLink.getFileMetadata().getWorkspace() != null ? shareLink.getFileMetadata().getWorkspace().getId() : null),
                user.getId(),
                username,
                AuditEventType.SHARE_REVOKED,
                EntityType.SHARE_LINK,
                null,
                "Revoked share link",
                "SUCCESS",
                AuditMetadata.builder().build()
        );
    }

    @Override
    public void verifySharePassword(UUID shareId, String password) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));
        validationService.validatePassword(shareLink, password);
    }

    @Override
    public SharePreviewDto getSharePreview(String token) {
        ShareLink shareLink = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new PermissionDeniedException("Share link invalid or not found"));

        validationService.validateLink(shareLink);

        FileMetadata file = shareLink.getFileMetadata();
        long size = 0;
        String fileName = "";
        String contentType = "";

        if (file != null) {
            size = file.getSize();
            fileName = file.getFilename();
            contentType = file.getContentType();
        } else if (shareLink.getWorkspace() != null) {
            fileName = shareLink.getWorkspace().getName();
            contentType = "application/directory";
        }

        return SharePreviewDto.builder()
                .shareLinkId(shareLink.getId())
                .fileName(fileName)
                .size(size)
                .contentType(contentType)
                .shareType(shareLink.getShareType().name())
                .allowPreview(shareLink.isAllowPreview())
                .allowDownload(shareLink.isAllowDownload())
                .allowUpload(shareLink.isAllowUpload())
                .passwordRequired(shareLink.getPasswordHash() != null)
                .workspaceName(shareLink.getWorkspace() != null ? shareLink.getWorkspace().getName() : (file != null && file.getWorkspace() != null ? file.getWorkspace().getName() : "Personal"))
                .ownerName(shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getUsername() : "System")
                .expiresAt(shareLink.getExpiresAt())
                .build();
    }

    @Override
    public byte[] generateQrCode(UUID shareId, String format, int width, int height) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        String text = "http://localhost:8080/public/" + shareLink.getToken();

        try {
            if ("SVG".equalsIgnoreCase(format)) {
                return generateSvgQr(text, width, height);
            } else {
                return generatePngQr(text, width, height);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR Code", e);
        }
    }

    // Helper methods for generating QR Codes with standard ZXing Core dependencies
    private byte[] generatePngQr(String text, int width, int height) throws Exception {
        com.google.zxing.qrcode.QRCodeWriter writer = new com.google.zxing.qrcode.QRCodeWriter();
        com.google.zxing.common.BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height);

        java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            }
        }

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }

    private byte[] generateSvgQr(String text, int width, int height) throws Exception {
        com.google.zxing.qrcode.QRCodeWriter writer = new com.google.zxing.qrcode.QRCodeWriter();
        com.google.zxing.common.BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height);

        int matrixWidth = matrix.getWidth();
        int matrixHeight = matrix.getHeight();

        StringBuilder sb = new StringBuilder();
        sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ")
                .append(matrixWidth).append(" ").append(matrixHeight)
                .append("\" width=\"").append(width).append("\" height=\"").append(height).append("\">\n");
        sb.append("  <rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>\n");
        sb.append("  <path d=\"");

        for (int y = 0; y < matrixHeight; y++) {
            for (int x = 0; x < matrixWidth; x++) {
                if (matrix.get(x, y)) {
                    sb.append("M").append(x).append(",").append(y).append("h1v1h-1z ");
                }
            }
        }
        sb.append("\" fill=\"#000000\"/>\n");
        sb.append("</svg>");

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Override
    public String generateSignedUrl(UUID shareId, long ttlSeconds) {
        ShareLink shareLink = shareLinkRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share link not found"));

        long expires = LocalDateTime.now().plusSeconds(ttlSeconds).toEpochSecond(ZoneOffset.UTC);
        String dataToSign = shareLink.getToken() + ":" + expires;
        String signature = computeHmac(dataToSign);

        return "/public/" + shareLink.getToken() + "/download?expires=" + expires + "&signature=" + signature;
    }

    @Override
    public boolean validateSignedUrl(String token, String expiresAt, String signature) {
        if (token == null || expiresAt == null || signature == null) {
            return false;
        }
        try {
            long expires = Long.parseLong(expiresAt);
            long now = LocalDateTime.now().toEpochSecond(ZoneOffset.UTC);
            if (now > expires) {
                return false;
            }
            String dataToSign = token + ":" + expiresAt;
            String expectedSignature = computeHmac(dataToSign);
            return MessageDigest.isEqual(
                    signature.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    expectedSignature.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            return false;
        }
    }

    private String computeHmac(String data) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(HMAC_SECRET_KEY, "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    @Override
    @Transactional
    public InputStream downloadSharedFile(String token, String password, String ip, String userAgent, boolean skipPasswordCheck) {
        long start = System.currentTimeMillis();
        ShareLink shareLink = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new PermissionDeniedException("Share link not found"));

        try {
            validationService.validateLink(shareLink);
            if (!skipPasswordCheck) {
                validationService.validatePassword(shareLink, password);
            }

            if (!shareLink.isAllowDownload()) {
                throw new PermissionDeniedException("Downloading is disabled for this share link");
            }

            FileMetadata file = shareLink.getFileMetadata();
            if (file == null) {
                throw new RuntimeException("This share link does not point to a single file");
            }

            // Increment download count
            shareLink.setDownloadCount(shareLink.getDownloadCount() + 1);
            shareLink.setLastAccessedAt(LocalDateTime.now());
            shareLinkRepository.save(shareLink);

            InputStream is = storageService.downloadFileInternal(file.getId());

            long duration = System.currentTimeMillis() - start;
            analyticsService.logAccess(shareLink, shareLink.getCreatedBy(), ip, userAgent, AccessOperation.DOWNLOAD, "SUCCESS", duration);

            auditService.logEvent(
                    file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                    shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getId() : null,
                    shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getUsername() : "Anonymous",
                    AuditEventType.SHARE_DOWNLOADED,
                    EntityType.FILE,
                    file.getId(),
                    "Downloaded shared file: " + file.getFilename(),
                    "SUCCESS",
                    AuditMetadata.builder().clientIp(ip).userAgent(userAgent).executionDuration(duration).build()
            );

            return is;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            analyticsService.logAccess(shareLink, null, ip, userAgent, AccessOperation.DOWNLOAD, "FAILURE: " + e.getMessage(), duration);
            throw e;
        }
    }

    @Override
    @Transactional
    public InputStream previewSharedFile(String token, String password, String ip, String userAgent, boolean skipPasswordCheck) {
        long start = System.currentTimeMillis();
        ShareLink shareLink = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new PermissionDeniedException("Share link not found"));

        try {
            validationService.validateLink(shareLink);
            if (!skipPasswordCheck) {
                validationService.validatePassword(shareLink, password);
            }

            if (!shareLink.isAllowPreview()) {
                throw new PermissionDeniedException("Previewing is disabled for this share link");
            }

            FileMetadata file = shareLink.getFileMetadata();
            if (file == null) {
                throw new RuntimeException("This share link does not point to a single file");
            }

            // Increment view count
            shareLink.setViewCount(shareLink.getViewCount() + 1);
            shareLink.setLastAccessedAt(LocalDateTime.now());
            shareLinkRepository.save(shareLink);

            InputStream is = storageService.downloadFileInternal(file.getId());

            long duration = System.currentTimeMillis() - start;
            analyticsService.logAccess(shareLink, shareLink.getCreatedBy(), ip, userAgent, AccessOperation.PREVIEW, "SUCCESS", duration);

            auditService.logEvent(
                    file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                    shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getId() : null,
                    shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getUsername() : "Anonymous",
                    AuditEventType.SHARE_VIEWED,
                    EntityType.FILE,
                    file.getId(),
                    "Previewed shared file: " + file.getFilename(),
                    "SUCCESS",
                    AuditMetadata.builder().clientIp(ip).userAgent(userAgent).executionDuration(duration).build()
            );

            return is;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            analyticsService.logAccess(shareLink, null, ip, userAgent, AccessOperation.PREVIEW, "FAILURE: " + e.getMessage(), duration);
            throw e;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public FileMetadata getSharedFileMetadataByToken(String token) {
        ShareLink shareLink = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new PermissionDeniedException("Share link not found"));
        FileMetadata file = shareLink.getFileMetadata();
        if (file == null) {
            throw new RuntimeException("Share link does not reference a file");
        }
        // Force initialization by accessing the id to avoid LazyInitializationException in controller
        return fileRepository.findById(file.getId())
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    private ShareLinkDto mapToDto(ShareLink shareLink) {
        return ShareLinkDto.builder()
                .id(shareLink.getId())
                .token(shareLink.getToken())
                .fileId(shareLink.getFileMetadata() != null ? shareLink.getFileMetadata().getId() : null)
                .fileName(shareLink.getFileMetadata() != null ? shareLink.getFileMetadata().getFilename() : null)
                .workspaceId(shareLink.getWorkspace() != null ? shareLink.getWorkspace().getId() : null)
                .workspaceName(shareLink.getWorkspace() != null ? shareLink.getWorkspace().getName() : null)
                .createdBy(shareLink.getCreatedBy() != null ? shareLink.getCreatedBy().getUsername() : "System")
                .shareType(shareLink.getShareType().name())
                .permission(shareLink.getPermission().name())
                .expiresAt(shareLink.getExpiresAt())
                .downloadLimit(shareLink.getDownloadLimit())
                .downloadCount(shareLink.getDownloadCount())
                .viewLimit(shareLink.getViewLimit())
                .viewCount(shareLink.getViewCount())
                .allowPreview(shareLink.isAllowPreview())
                .allowDownload(shareLink.isAllowDownload())
                .allowUpload(shareLink.isAllowUpload())
                .allowReshare(shareLink.isAllowReshare())
                .active(shareLink.isActive())
                .lastAccessedAt(shareLink.getLastAccessedAt())
                .createdAt(shareLink.getCreatedAt())
                .updatedAt(shareLink.getUpdatedAt())
                .build();
    }
}
