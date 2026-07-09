package com.cloudstorage.backend.service;

import java.io.IOException;

public interface ChunkMergeService {
    /**
     * Merges all uploaded chunks for a session in order and calculates the SHA-256 hash.
     *
     * @param sessionId the session identifier
     * @param totalChunks the total number of chunks
     * @return the result containing the merged file path, computed SHA-256, and final size
     * @throws IOException if merging fails
     */
    MergeResult mergeChunks(String sessionId, int totalChunks) throws IOException;
}
