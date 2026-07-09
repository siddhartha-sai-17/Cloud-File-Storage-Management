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

@Service
@RequiredArgsConstructor
public class LocalChunkMergeService implements ChunkMergeService {

    private static final Logger logger = LoggerFactory.getLogger(LocalChunkMergeService.class);
    private final UploadConfig uploadConfig;
    private final ChunkStorageService chunkStorageService;
    private final UploadBufferPool uploadBufferPool;

    @Override
    public MergeResult mergeChunks(String sessionId, int totalChunks) throws IOException {
        String baseDir = uploadConfig.getTempDir();
        Path sessionDir = Paths.get(baseDir, sessionId);
        Files.createDirectories(sessionDir);

        File mergedFile = sessionDir.resolve("merged.tmp").toFile();
        long size = 0;
        String checksum;

        byte[] heapBuffer = uploadBufferPool.borrowBuffer();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            
            if (uploadConfig.isPerformanceEnableFileChannel()) {
                try (FileOutputStream fos = new FileOutputStream(mergedFile);
                     java.nio.channels.FileChannel destChannel = fos.getChannel()) {
                    java.nio.ByteBuffer byteBuffer = java.nio.ByteBuffer.wrap(heapBuffer);
                    for (int chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
                        logger.debug("Sequential Merge FileChannel: Processing chunk {}/{} for session {}", chunkNum, totalChunks, sessionId);
                        try (InputStream input = chunkStorageService.getChunkStream(sessionId, chunkNum);
                             java.nio.channels.ReadableByteChannel srcChannel = java.nio.channels.Channels.newChannel(input)) {
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
                        }
                    }
                    destChannel.force(true);
                }
            } else {
                try (FileOutputStream fos = new FileOutputStream(mergedFile);
                     BufferedOutputStream bos = new BufferedOutputStream(fos, uploadConfig.getPerformanceBufferSize());
                     DigestOutputStream dos = new DigestOutputStream(bos, digest)) {
                    for (int chunkNum = 1; chunkNum <= totalChunks; chunkNum++) {
                        logger.debug("Sequential Merge Streaming: Processing chunk {}/{} for session {}", chunkNum, totalChunks, sessionId);
                        try (InputStream input = chunkStorageService.getChunkStream(sessionId, chunkNum)) {
                            int bytesRead;
                            while ((bytesRead = input.read(heapBuffer)) != -1) {
                                dos.write(heapBuffer, 0, bytesRead);
                                size += bytesRead;
                            }
                        }
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

            logger.info("Chunk Merge Completed: sessionId={}, totalChunks={}, size={}, checksum={}", 
                    sessionId, totalChunks, size, checksum);

        } catch (NoSuchAlgorithmException e) {
            throw new IOException("SHA-256 algorithm not found", e);
        } catch (IOException e) {
            if (mergedFile.exists()) {
                if (!mergedFile.delete()) {
                    logger.error("Failed to delete incomplete merged file {}", mergedFile.getAbsolutePath());
                }
            }
            throw e;
        } finally {
            uploadBufferPool.returnBuffer(heapBuffer);
        }

        return new MergeResult(mergedFile.getAbsolutePath(), checksum, size);
    }
}
