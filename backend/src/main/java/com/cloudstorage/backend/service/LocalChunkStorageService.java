package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LocalChunkStorageService implements ChunkStorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalChunkStorageService.class);
    private final UploadConfig uploadConfig;
    private final UploadBufferPool uploadBufferPool;

    @Override
    public ChunkWriteResult saveChunk(String sessionId, int chunkNumber, InputStream input) throws IOException {
        String baseDir = uploadConfig.getTempDir();
        Path sessionDir = Paths.get(baseDir, sessionId);
        Files.createDirectories(sessionDir);

        File tempFile = sessionDir.resolve("chunk_" + chunkNumber + ".tmp").toFile();
        File finalFile = sessionDir.resolve(String.valueOf(chunkNumber)).toFile();

        long size = 0;
        String checksum;

        byte[] heapBuffer = uploadBufferPool.borrowBuffer();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            
            InputStream streamToUse = input;
            if (uploadConfig.isPerformanceEnableStreaming() && !(input instanceof BufferedInputStream)) {
                streamToUse = new BufferedInputStream(input, uploadConfig.getPerformanceBufferSize());
            }

            if (uploadConfig.isPerformanceEnableFileChannel()) {
                try (FileOutputStream fos = new FileOutputStream(tempFile);
                     java.nio.channels.FileChannel destChannel = fos.getChannel();
                     java.nio.channels.ReadableByteChannel srcChannel = java.nio.channels.Channels.newChannel(streamToUse)) {
                    java.nio.ByteBuffer byteBuffer = java.nio.ByteBuffer.wrap(heapBuffer);
                    while (true) {
                        byteBuffer.clear();
                        int bytesRead = srcChannel.read(byteBuffer);
                        if (bytesRead == -1) {
                            break;
                        }
                        byteBuffer.flip();
                        digest.update(heapBuffer, 0, bytesRead);
                        while (byteBuffer.hasRemaining()) {
                            destChannel.write(byteBuffer);
                        }
                        size += bytesRead;
                    }
                    destChannel.force(true);
                }
            } else {
                try (FileOutputStream fos = new FileOutputStream(tempFile);
                     BufferedOutputStream bos = new BufferedOutputStream(fos, uploadConfig.getPerformanceBufferSize());
                     DigestOutputStream dos = new DigestOutputStream(bos, digest)) {
                    int bytesRead;
                    while ((bytesRead = streamToUse.read(heapBuffer)) != -1) {
                        dos.write(heapBuffer, 0, bytesRead);
                        size += bytesRead;
                    }
                    dos.flush();
                    fos.getFD().sync();
                }
            }

            // Convert digest bytes to hex
            byte[] hash = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            checksum = hexString.toString();

            // Perform atomic move
            try {
                Files.move(tempFile.toPath(), finalFile.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                logger.warn("ATOMIC_MOVE failed for session {}, falling back to standard replace_existing move", sessionId, e);
                Files.move(tempFile.toPath(), finalFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }

        } catch (NoSuchAlgorithmException e) {
            throw new IOException("SHA-256 algorithm not found", e);
        } catch (IOException e) {
            // Clean up the temp file if write failed
            if (tempFile.exists()) {
                if (!tempFile.delete()) {
                    logger.error("Failed to delete temp file {}", tempFile.getAbsolutePath());
                }
            }
            throw e;
        } finally {
            uploadBufferPool.returnBuffer(heapBuffer);
        }

        return new ChunkWriteResult(checksum, size, finalFile.getAbsolutePath());
    }

    @Override
    public void deleteChunk(String sessionId, int chunkNumber) throws IOException {
        String baseDir = uploadConfig.getTempDir();
        Path chunkPath = Paths.get(baseDir, sessionId, String.valueOf(chunkNumber));
        if (Files.exists(chunkPath)) {
            Files.delete(chunkPath);
            logger.info("Deleted chunk file: sessionId={}, chunkNumber={}", sessionId, chunkNumber);
        }
    }

    @Override
    public void deleteSession(String sessionId) throws IOException {
        String baseDir = uploadConfig.getTempDir();
        Path sessionDir = Paths.get(baseDir, sessionId);
        if (Files.exists(sessionDir)) {
            // Delete recursively
            try (var stream = Files.walk(sessionDir)) {
                stream.sorted((p1, p2) -> p2.compareTo(p1)) // delete files before directories
                      .forEach(path -> {
                          try {
                              Files.delete(path);
                          } catch (IOException e) {
                              logger.error("Failed to delete path during session cleanup: {}", path, e);
                          }
                      });
            }
            logger.info("Deleted temporary session directory: sessionId={}", sessionId);
        }
    }

    @Override
    public void cleanupExpiredSessions(List<String> activeSessionIds) throws IOException {
        // Future cleanup job implementation placeholder
        logger.debug("cleanupExpiredSessions called (no-op placeholder)");
    }

    @Override
    public void cleanupOrphanFiles() throws IOException {
        // Future cleanup job implementation placeholder
        logger.debug("cleanupOrphanFiles called (no-op placeholder)");
    }

    @Override
    public InputStream getChunkStream(String sessionId, int chunkNumber) throws IOException {
        String baseDir = uploadConfig.getTempDir();
        Path chunkPath = Paths.get(baseDir, sessionId, String.valueOf(chunkNumber));
        if (!Files.exists(chunkPath)) {
            throw new FileNotFoundException("Chunk file " + chunkNumber + " not found for session " + sessionId);
        }
        InputStream is = Files.newInputStream(chunkPath);
        if (uploadConfig.isPerformanceEnableStreaming()) {
            return new BufferedInputStream(is, uploadConfig.getPerformanceBufferSize());
        }
        return is;
    }
}
