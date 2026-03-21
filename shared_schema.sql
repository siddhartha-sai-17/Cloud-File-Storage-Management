CREATE TABLE IF NOT EXISTS shared_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_id BIGINT NOT NULL,
    token VARCHAR(36) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_shared_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX idx_shared_token ON shared_files(token);
CREATE INDEX idx_shared_file_id ON shared_files(file_id);
