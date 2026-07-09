package com.cloudstorage.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface ChunkStorageService {

    /**
     * Streams the input, calculates the SHA-256 checksum and written size in a single pass,
     * and saves the chunk to the storage.
     *
     * @param sessionId the session identifier
     * @param chunkNumber the index of the chunk
     * @param input the input stream of the chunk data
     * @return the result containing checksum, size, and file path
     * @throws IOException if storage write fails
     */
    ChunkWriteResult saveChunk(String sessionId, int chunkNumber, InputStream input) throws IOException;

    /**
     * Deletes a specific chunk file from storage.
     *
     * @param sessionId the session identifier
     * @param chunkNumber the index of the chunk
     * @throws IOException if delete fails
     */
    void deleteChunk(String sessionId, int chunkNumber) throws IOException;

    /**
     * Deletes all chunk files associated with an upload session.
     *
     * @param sessionId the session identifier
     * @throws IOException if delete fails
     */
    void deleteSession(String sessionId) throws IOException;

    /**
     * Exposes a future cleanup method for expired sessions.
     * Only define the abstraction for now, implementation can be empty/no-op.
     *
     * @param activeSessionIds currently active session IDs to preserve
     */
    void cleanupExpiredSessions(List<String> activeSessionIds) throws IOException;

    /**
     * Exposes a future cleanup method for orphan files.
     * Only define the abstraction for now, implementation can be empty/no-op.
     */
    void cleanupOrphanFiles() throws IOException;

    /**
     * Retrieves an input stream for reading a specific chunk.
     *
     * @param sessionId the session identifier
     * @param chunkNumber the index of the chunk
     * @return the input stream of the chunk data
     * @throws IOException if the chunk does not exist or cannot be read
     */
    InputStream getChunkStream(String sessionId, int chunkNumber) throws IOException;
}
