package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Comment;

public interface MentionService {
    void parseAndProcessMentions(Comment comment);
}
