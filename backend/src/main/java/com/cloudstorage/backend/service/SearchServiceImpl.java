package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.SearchRequestDto;
import com.cloudstorage.backend.dto.SearchResultDto;
import com.cloudstorage.backend.dto.SearchSuggestionDto;
import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.OcrContent;
import com.cloudstorage.backend.entity.PermissionLevel;
import com.cloudstorage.backend.entity.ShareType;
import com.cloudstorage.backend.entity.SharedFile;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.WorkspaceMember;
import com.cloudstorage.backend.entity.WorkspaceMemberStatus;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.OcrContentRepository;
import com.cloudstorage.backend.repository.ShareLinkRepository;
import com.cloudstorage.backend.repository.SharedFileRepository;
import com.cloudstorage.backend.repository.SharedUserRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceMemberRepository;
import com.cloudstorage.backend.security.WorkspaceContextHolder;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final FileRepository fileRepository;
    private final OcrContentRepository ocrContentRepository;
    private final SharedFileRepository sharedFileRepository;
    private final SearchQueryParserService searchQueryParserService;
    private final com.cloudstorage.backend.repository.CommentRepository commentRepository;
    private final com.cloudstorage.backend.repository.AuditRepository auditRepository;
    private final AuditService auditService;
    private final ShareLinkRepository shareLinkRepository;
    private final SharedUserRepository sharedUserRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final com.cloudstorage.backend.repository.FileVersionRepository fileVersionRepository;

    @Value("${search.snippet.length:200}")
    private int snippetLength;

    @Value("${search.max-results:100}")
    private int maxResults;

    private final ConcurrentHashMap<String, List<String>> recentQueriesMap = new ConcurrentHashMap<>();

    @Override
    @Transactional(readOnly = true)
    @org.springframework.cache.annotation.Cacheable(value = "searchCache", key = "#username + '_' + #request.query + '_' + #request.page + '_' + #request.size + '_' + #request.sortBy + '_' + #request.direction", condition = "#request.query != null")
    public Page<SearchResultDto> search(String username, SearchRequestDto request) {
        String queryStr = request.getQuery();
        SearchQueryParserService.SearchNode ast = searchQueryParserService.parse(queryStr);

        Specification<FileMetadata> parsedSpec = buildSpecification(ast, username);

        // Security boundary: non-admin users can search owned, workspace membership, and shared files/workspaces
        User userEntity = userRepository.findByUsername(username).orElse(null);
        Specification<FileMetadata> securitySpec;
        if (userEntity == null) {
            securitySpec = (root, query, cb) -> cb.disjunction();
        } else if (userEntity.isSysAdmin()) {
            securitySpec = (root, query, cb) -> cb.conjunction();
        } else {
            List<Long> workspaceIds = workspaceMemberRepository.findByUser(userEntity).stream()
                    .filter(m -> m.getStatus() == WorkspaceMemberStatus.ACTIVE)
                    .map(m -> m.getWorkspace().getId())
                    .collect(Collectors.toList());

            List<Long> sharedFileIds = sharedUserRepository.findByUserUsername(username).stream()
                    .filter(su -> su.getShareLink().isActive() && su.getShareLink().getFileMetadata() != null)
                    .map(su -> su.getShareLink().getFileMetadata().getId())
                    .collect(Collectors.toList());

            List<Long> sharedWorkspaceIds = sharedUserRepository.findByUserUsername(username).stream()
                    .filter(su -> su.getShareLink().isActive() && su.getShareLink().getWorkspace() != null)
                    .map(su -> su.getShareLink().getWorkspace().getId())
                    .collect(Collectors.toList());

            List<Long> internalFileIds = shareLinkRepository.findAll().stream()
                    .filter(s -> s.isActive() && s.getShareType() == ShareType.INTERNAL && s.getFileMetadata() != null)
                    .map(s -> s.getFileMetadata().getId())
                    .collect(Collectors.toList());

            List<Long> internalWorkspaceIds = shareLinkRepository.findAll().stream()
                    .filter(s -> s.isActive() && s.getShareType() == ShareType.INTERNAL && s.getWorkspace() != null)
                    .map(s -> s.getWorkspace().getId())
                    .collect(Collectors.toList());

            securitySpec = (root, query, cb) -> {
                List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
                predicates.add(cb.equal(root.get("user").get("username"), username));

                if (!workspaceIds.isEmpty()) {
                    predicates.add(root.get("workspace").get("id").in(workspaceIds));
                }

                List<Long> allSharedFileIds = new ArrayList<>(sharedFileIds);
                allSharedFileIds.addAll(internalFileIds);
                if (!allSharedFileIds.isEmpty()) {
                    predicates.add(root.get("id").in(allSharedFileIds));
                }

                List<Long> allSharedWorkspaceIds = new ArrayList<>(sharedWorkspaceIds);
                allSharedWorkspaceIds.addAll(internalWorkspaceIds);
                if (!allSharedWorkspaceIds.isEmpty()) {
                    predicates.add(root.get("workspace").get("id").in(allSharedWorkspaceIds));
                }

                return cb.or(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            };
        }

        // Workspace boundary: scope search to the active workspace when a context is set
        Long workspaceId = WorkspaceContextHolder.getCurrentWorkspaceId();
        Specification<FileMetadata> workspaceSpec = (root, query, cb) -> {
            if (workspaceId != null) {
                return cb.equal(root.get("workspace").get("id"), workspaceId);
            }
            return cb.conjunction();
        };

        // Filter out soft-deleted files unless query explicitly asks for deleted:true
        Specification<FileMetadata> softDeleteSpec = (root, query, cb) -> {
            if (queryStr != null && queryStr.toLowerCase().contains("deleted:true")) {
                return cb.conjunction();
            }
            return cb.equal(root.get("deleted"), false);
        };

        Specification<FileMetadata> finalSpec = Specification.where(securitySpec)
                .and(workspaceSpec)
                .and(softDeleteSpec)
                .and(parsedSpec);

        List<FileMetadata> files = fileRepository.findAll(finalSpec);

        // Score, Rank, Highlight, and Paginate
        List<SearchResultDto> scoredResults = files.stream()
                .map(file -> {
                    OcrContent ocr = ocrContentRepository.findByFileMetadata(file).orElse(null);
                    double score = calculateScore(file, queryStr, ocr);
                    List<String> matchedFields = findMatchedFields(file, queryStr, ocr);
                    String snippet = generateSnippetAndHighlight(ocr != null ? ocr.getExtractedText() : null, queryStr);
                    List<String> highlights = computeHighlights(file, queryStr);

                    return SearchResultDto.builder()
                            .fileId(file.getId())
                            .filename(file.getFilename())
                            .owner(file.getUser().getUsername())
                            .folder(file.getFolder() != null ? file.getFolder().getName() : "Root")
                            .category(file.getCategory() != null ? file.getCategory() : "Other")
                            .score(score)
                            .matchedFields(matchedFields)
                            .snippet(snippet)
                            .highlights(highlights)
                            .build();
                })
                .sorted((r1, r2) -> Double.compare(r2.getScore(), r1.getScore())) // Rank descending
                .limit(maxResults)
                .collect(Collectors.toList());

        // Phase 6: Comment Search (if we want to include comments in global search)
        if (queryStr != null && !queryStr.trim().isEmpty()) {
            List<com.cloudstorage.backend.entity.Comment> comments = commentRepository.findAll().stream()
                .filter(c -> !c.isDeleted() && c.getContent().toLowerCase().contains(queryStr.toLowerCase()))
                .filter(c -> {
                    // Restrict to workspace if needed
                    if (workspaceId != null && c.getFile() != null && c.getFile().getWorkspace() != null) {
                        return c.getFile().getWorkspace().getId().equals(workspaceId);
                    }
                    return true;
                })
                .collect(Collectors.toList());

            for (com.cloudstorage.backend.entity.Comment c : comments) {
                scoredResults.add(SearchResultDto.builder()
                        .entityType("COMMENT")
                        .entityId(c.getId())
                        .fileId(c.getFile().getId())
                        .filename(c.getFile().getFilename())
                        .owner(c.getUser().getUsername())
                        .title("Comment by " + c.getUser().getUsername())
                        .score(15.0) // base score for comment match
                        .matchedFields(Collections.singletonList("commentContent"))
                        .snippet(generateSnippetAndHighlight(c.getContent(), queryStr))
                        .build());
            }

            // Simple Audit Search inclusion
            List<com.cloudstorage.backend.entity.AuditEvent> audits = auditRepository.findAll().stream()
                .filter(a -> a.getDescription() != null && a.getDescription().toLowerCase().contains(queryStr.toLowerCase()))
                .filter(a -> workspaceId == null || (a.getWorkspaceId() != null && a.getWorkspaceId().equals(workspaceId)))
                .collect(Collectors.toList());

            for (com.cloudstorage.backend.entity.AuditEvent a : audits) {
                scoredResults.add(SearchResultDto.builder()
                        .entityType("AUDIT")
                        .entityId(a.getId())
                        .owner(a.getUsername())
                        .title(a.getEventType().name())
                        .score(10.0)
                        .matchedFields(Collections.singletonList("auditDescription"))
                        .snippet(generateSnippetAndHighlight(a.getDescription(), queryStr))
                        .build());
            }
            
            // Re-sort with new items
            scoredResults.sort((r1, r2) -> Double.compare(r2.getScore(), r1.getScore()));
            if (scoredResults.size() > maxResults) {
                scoredResults = scoredResults.subList(0, maxResults);
            }
        }

        // Save recent query
        if (queryStr != null && !queryStr.trim().isEmpty()) {
            recordQuery(username, queryStr.trim());
            
            if (auditService != null) {
                auditService.logEvent(workspaceId, null, username,
                    com.cloudstorage.backend.entity.AuditEventType.SEARCH_EXECUTED,
                    com.cloudstorage.backend.entity.EntityType.WORKSPACE, workspaceId,
                    "Executed global search for query: " + queryStr, "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
            }
        }

        // Manual pagination
        int start = Math.min(request.getPage() * request.getSize(), scoredResults.size());
        int end = Math.min(start + request.getSize(), scoredResults.size());
        List<SearchResultDto> paginated = scoredResults.subList(start, end);

        Pageable pageable = PageRequest.of(request.getPage(), request.getSize());
        return new PageImpl<>(paginated, pageable, scoredResults.size());
    }

    private Specification<FileMetadata> buildSpecification(SearchQueryParserService.SearchNode node, String username) {
        if (node instanceof SearchQueryParserService.AndNode) {
            SearchQueryParserService.AndNode andNode = (SearchQueryParserService.AndNode) node;
            Specification<FileMetadata> spec = Specification.where(null);
            for (SearchQueryParserService.SearchNode child : andNode.getChildren()) {
                spec = spec.and(buildSpecification(child, username));
            }
            return spec;
        } else if (node instanceof SearchQueryParserService.OrNode) {
            SearchQueryParserService.OrNode orNode = (SearchQueryParserService.OrNode) node;
            Specification<FileMetadata> spec = Specification.where(null);
            boolean first = true;
            for (SearchQueryParserService.SearchNode child : orNode.getChildren()) {
                if (first) {
                    spec = Specification.where(buildSpecification(child, username));
                    first = false;
                } else {
                    spec = spec.or(buildSpecification(child, username));
                }
            }
            return spec;
        } else if (node instanceof SearchQueryParserService.NotNode) {
            SearchQueryParserService.NotNode notNode = (SearchQueryParserService.NotNode) node;
            // Pre-materialise the positive matches and exclude those IDs.
            // Specification.not() can produce NULL (not FALSE) for rows with NULL-able
            // columns (tags, category), causing those rows to be dropped from results.
            Specification<FileMetadata> innerSpec = buildSpecification(notNode.getChild(), username);
            Specification<FileMetadata> secFilter = (root, q, cb) -> cb.equal(root.get("user").get("username"), username);
            Specification<FileMetadata> sdFilter  = (root, q, cb) -> cb.equal(root.get("deleted"), false);
            List<Long> excludedIds = fileRepository.findAll(Specification.where(secFilter).and(sdFilter).and(innerSpec))
                    .stream().map(FileMetadata::getId).collect(Collectors.toList());
            return (root, query, cb) -> excludedIds.isEmpty()
                    ? cb.conjunction()
                    : cb.not(root.get("id").in(excludedIds));
        } else if (node instanceof SearchQueryParserService.FieldNode) {
            SearchQueryParserService.FieldNode fn = (SearchQueryParserService.FieldNode) node;
            return buildFieldSpecification(fn, username);
        } else if (node instanceof SearchQueryParserService.TermNode) {
            SearchQueryParserService.TermNode tn = (SearchQueryParserService.TermNode) node;
            return buildTermSpecification(tn, username);
        }
        return Specification.where(null);
    }

    private Specification<FileMetadata> buildFieldSpecification(SearchQueryParserService.FieldNode fn, String username) {
        String field = fn.getField();
        String operator = fn.getOperator();
        String val = fn.getValue();

        switch (field) {
            case "filename":
                return (root, query, cb) -> cb.like(cb.lower(root.get("filename")), "%" + val.toLowerCase() + "%");
            case "owner":
                return (root, query, cb) -> cb.like(cb.lower(root.get("user").get("username")), "%" + val.toLowerCase() + "%");
            case "tag":
                return (root, query, cb) -> cb.like(cb.lower(root.get("tags")), "%" + val.toLowerCase() + "%");
            case "category":
                return (root, query, cb) -> cb.equal(cb.lower(root.get("category")), val.toLowerCase());
            case "type":
                return (root, query, cb) -> cb.like(cb.lower(root.get("contentType")), "%" + val.toLowerCase() + "%");
            case "starred":
                return (root, query, cb) -> cb.equal(root.get("starred"), Boolean.parseBoolean(val));
            case "deleted":
                return (root, query, cb) -> cb.equal(root.get("deleted"), Boolean.parseBoolean(val));
            case "shared":
                boolean sharedVal = Boolean.parseBoolean(val);
                List<Long> legacyShared = sharedFileRepository.findAll().stream()
                        .filter(SharedFile::isActive)
                        .map(sf -> sf.getFile().getId())
                        .collect(Collectors.toList());
                List<Long> enterpriseShared = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && s.getFileMetadata() != null)
                        .map(s -> s.getFileMetadata().getId())
                        .collect(Collectors.toList());
                List<Long> sharedFileIds = new ArrayList<>(legacyShared);
                sharedFileIds.addAll(enterpriseShared);
                
                List<Long> sharedWorkspaceIds = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && s.getWorkspace() != null)
                        .map(s -> s.getWorkspace().getId())
                        .collect(Collectors.toList());
                return (root, query, cb) -> {
                    jakarta.persistence.criteria.Predicate fileShared = root.get("id").in(sharedFileIds.isEmpty() ? Collections.singletonList(-1L) : sharedFileIds);
                    jakarta.persistence.criteria.Predicate workspaceShared = root.get("workspace").get("id").in(sharedWorkspaceIds.isEmpty() ? Collections.singletonList(-1L) : sharedWorkspaceIds);
                    jakarta.persistence.criteria.Predicate isShared = cb.or(fileShared, workspaceShared);
                    if (sharedVal) {
                        return isShared;
                    } else {
                        return cb.not(isShared);
                    }
                };
            case "public":
                boolean publicVal = Boolean.parseBoolean(val);
                List<Long> publicFileIds = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && (s.getShareType() == ShareType.PUBLIC || s.getShareType() == ShareType.ANONYMOUS) && s.getFileMetadata() != null)
                        .map(s -> s.getFileMetadata().getId())
                        .collect(Collectors.toList());
                List<Long> publicWorkspaceIds = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && (s.getShareType() == ShareType.PUBLIC || s.getShareType() == ShareType.ANONYMOUS) && s.getWorkspace() != null)
                        .map(s -> s.getWorkspace().getId())
                        .collect(Collectors.toList());
                return (root, query, cb) -> {
                    jakarta.persistence.criteria.Predicate filePub = root.get("id").in(publicFileIds.isEmpty() ? Collections.singletonList(-1L) : publicFileIds);
                    jakarta.persistence.criteria.Predicate wsPub = root.get("workspace").get("id").in(publicWorkspaceIds.isEmpty() ? Collections.singletonList(-1L) : publicWorkspaceIds);
                    jakarta.persistence.criteria.Predicate isPub = cb.or(filePub, wsPub);
                    if (publicVal) {
                        return isPub;
                    } else {
                        return cb.not(isPub);
                    }
                };
            case "permission":
                PermissionLevel reqLevel = PermissionLevel.valueOf(val.toUpperCase());
                List<PermissionLevel> allowedLevels = new ArrayList<>();
                for (PermissionLevel pl : PermissionLevel.values()) {
                    if (pl.ordinal() >= reqLevel.ordinal()) {
                        allowedLevels.add(pl);
                    }
                }
                List<Long> permFileIds = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && allowedLevels.contains(s.getPermission()) && s.getFileMetadata() != null)
                        .map(s -> s.getFileMetadata().getId())
                        .collect(Collectors.toList());
                List<Long> permWorkspaceIds = shareLinkRepository.findAll().stream()
                        .filter(s -> s.isActive() && allowedLevels.contains(s.getPermission()) && s.getWorkspace() != null)
                        .map(s -> s.getWorkspace().getId())
                        .collect(Collectors.toList());
                return (root, query, cb) -> {
                    jakarta.persistence.criteria.Predicate filePerm = root.get("id").in(permFileIds.isEmpty() ? Collections.singletonList(-1L) : permFileIds);
                    jakarta.persistence.criteria.Predicate wsPerm = root.get("workspace").get("id").in(permWorkspaceIds.isEmpty() ? Collections.singletonList(-1L) : permWorkspaceIds);
                    return cb.or(filePerm, wsPerm);
                };
            case "workspace":
                return (root, query, cb) -> cb.like(cb.lower(root.get("workspace").get("name")), "%" + val.toLowerCase() + "%");
            case "size":
                long sizeVal = Long.parseLong(val);
                return (root, query, cb) -> {
                    if (">".equals(operator)) return cb.greaterThan(root.get("size"), sizeVal);
                    if ("<".equals(operator)) return cb.lessThan(root.get("size"), sizeVal);
                    return cb.equal(root.get("size"), sizeVal);
                };
            case "date":
                LocalDateTime dt = LocalDate.parse(val).atStartOfDay();
                return (root, query, cb) -> {
                    if (">".equals(operator)) return cb.greaterThan(root.get("uploadDate"), dt);
                    if ("<".equals(operator)) return cb.lessThan(root.get("uploadDate"), dt.plusDays(1));
                    return cb.between(root.get("uploadDate"), dt, dt.plusDays(1));
                };
            case "ocr":
                List<OcrContent> ocrMatches = ocrContentRepository.searchByUserAndText(username, val.toLowerCase());
                List<Long> matchedIds = ocrMatches.stream()
                        .map(o -> o.getFileMetadata().getId())
                        .collect(Collectors.toList());
                return (root, query, cb) -> matchedIds.isEmpty() ? cb.disjunction() : root.get("id").in(matchedIds);
            case "favorite":
                return (root, query, cb) -> cb.equal(root.get("starred"), Boolean.parseBoolean(val));
            case "trash":
                return (root, query, cb) -> cb.equal(root.get("deleted"), Boolean.parseBoolean(val));
            case "recent":
                boolean recentVal = Boolean.parseBoolean(val);
                LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
                return (root, query, cb) -> recentVal ? 
                        cb.greaterThan(root.get("uploadDate"), sevenDaysAgo) : 
                        cb.lessThanOrEqualTo(root.get("uploadDate"), sevenDaysAgo);
            case "large":
                boolean largeVal = Boolean.parseBoolean(val);
                long largeThreshold = 104857600L; // 100MB
                return (root, query, cb) -> largeVal ? 
                        cb.greaterThan(root.get("size"), largeThreshold) : 
                        cb.lessThanOrEqualTo(root.get("size"), largeThreshold);
            case "duplicate":
                boolean duplicateVal = Boolean.parseBoolean(val);
                List<String> dupHashes = fileRepository.findAll().stream()
                        .filter(f -> !f.isDeleted() && f.getSha256() != null)
                        .collect(Collectors.groupingBy(FileMetadata::getSha256, Collectors.counting()))
                        .entrySet().stream()
                        .filter(e -> e.getValue() > 1)
                        .map(Map.Entry::getKey)
                        .collect(Collectors.toList());
                return (root, query, cb) -> {
                    jakarta.persistence.criteria.Predicate isDup = root.get("sha256").in(dupHashes.isEmpty() ? Collections.singletonList("-NOMATCH-") : dupHashes);
                    return duplicateVal ? isDup : cb.not(isDup);
                };
            case "versioned":
                boolean versionedVal = Boolean.parseBoolean(val);
                List<Long> versionedFileIds = fileVersionRepository.findAll().stream()
                        .map(v -> v.getFileMetadata().getId())
                        .distinct()
                        .collect(Collectors.toList());
                return (root, query, cb) -> {
                    jakarta.persistence.criteria.Predicate isVer = root.get("id").in(versionedFileIds.isEmpty() ? Collections.singletonList(-1L) : versionedFileIds);
                    return versionedVal ? isVer : cb.not(isVer);
                };
            case "comment":
                List<Long> commentedFileIds = commentRepository.findAll().stream()
                        .filter(c -> !c.isDeleted() && c.getFile() != null && c.getContent() != null && c.getContent().toLowerCase().contains(val.toLowerCase()))
                        .map(c -> c.getFile().getId())
                        .distinct()
                        .collect(Collectors.toList());
                return (root, query, cb) -> root.get("id").in(commentedFileIds.isEmpty() ? Collections.singletonList(-1L) : commentedFileIds);
            case "mention":
                List<Long> mentionedFileIds = commentRepository.findAll().stream()
                        .filter(c -> !c.isDeleted() && c.getFile() != null && c.getMentions() != null &&
                                c.getMentions().stream().anyMatch(m -> m.getMentionedUser() != null && m.getMentionedUser().getUsername().equalsIgnoreCase(val)))
                        .map(c -> c.getFile().getId())
                        .distinct()
                        .collect(Collectors.toList());
                return (root, query, cb) -> root.get("id").in(mentionedFileIds.isEmpty() ? Collections.singletonList(-1L) : mentionedFileIds);
            case "uploaded":
            case "modified":
                LocalDateTime uploadDt = LocalDate.parse(val).atStartOfDay();
                return (root, query, cb) -> {
                    if (">".equals(operator)) return cb.greaterThan(root.get("uploadDate"), uploadDt);
                    if ("<".equals(operator)) return cb.lessThan(root.get("uploadDate"), uploadDt.plusDays(1));
                    return cb.between(root.get("uploadDate"), uploadDt, uploadDt.plusDays(1));
                };
            case "extension":
                return (root, query, cb) -> cb.like(cb.lower(root.get("filename")), "%." + val.toLowerCase());
            case "mime":
                return (root, query, cb) -> cb.like(cb.lower(root.get("contentType")), "%" + val.toLowerCase() + "%");
            default:
                return Specification.where(null);
        }
    }

    private Specification<FileMetadata> buildTermSpecification(SearchQueryParserService.TermNode tn, String username) {
        String term = tn.getTerm().toLowerCase();
        List<OcrContent> ocrMatches = ocrContentRepository.searchByUserAndText(username, term);
        List<Long> matchedFileIds = ocrMatches.stream()
                .map(o -> o.getFileMetadata().getId())
                .collect(Collectors.toList());

        // Find file IDs matching comment content or mention usernames
        List<Long> commentMatchedFileIds = commentRepository.findAll().stream()
                .filter(c -> !c.isDeleted() && c.getFile() != null)
                .filter(c -> (c.getContent() != null && c.getContent().toLowerCase().contains(term)) ||
                             (c.getMentions() != null && c.getMentions().stream().anyMatch(m -> m.getMentionedUser() != null && m.getMentionedUser().getUsername().toLowerCase().contains(term))))
                .map(c -> c.getFile().getId())
                .distinct()
                .collect(Collectors.toList());

        return (root, query, cb) -> {
            Predicate pFilename = cb.like(cb.lower(root.get("filename")), "%" + term + "%");
            Predicate pTags = cb.like(
                    cb.lower(cb.coalesce(root.get("tags"), "")), "%" + term + "%");
            Predicate pCategory = cb.like(
                    cb.lower(cb.coalesce(root.get("category"), "")), "%" + term + "%");

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(pFilename);
            predicates.add(pTags);
            predicates.add(pCategory);

            if (!matchedFileIds.isEmpty()) {
                predicates.add(root.get("id").in(matchedFileIds));
            }
            if (!commentMatchedFileIds.isEmpty()) {
                predicates.add(root.get("id").in(commentMatchedFileIds));
            }

            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    private double calculateScore(FileMetadata file, String query, OcrContent ocr) {
        if (query == null || query.trim().isEmpty()) return 1.0;
        double score = 0.0;
        String filename = file.getFilename().toLowerCase();
        String q = query.toLowerCase();

        // Exact match boost
        if (filename.equals(q)) {
            score += 100.0;
        } else if (filename.startsWith(q)) {
            score += 50.0;
        } else if (filename.contains(q)) {
            score += 20.0;
        }

        if (file.getTags() != null && file.getTags().toLowerCase().contains(q)) {
            score += 30.0;
        }

        if (file.getCategory() != null && file.getCategory().toLowerCase().contains(q)) {
            score += 10.0;
        }

        if (ocr != null && ocr.getExtractedText() != null) {
            String text = ocr.getExtractedText().toLowerCase();
            int count = countOccurrences(text, q);
            score += count * 5.0;
        }

        // Comment match boost
        if (file.getComments() != null && !file.getComments().isEmpty()) {
            boolean hasCommentMatch = file.getComments().stream()
                    .filter(c -> !c.isDeleted())
                    .anyMatch(c -> (c.getContent() != null && c.getContent().toLowerCase().contains(q)) ||
                                   (c.getMentions() != null && c.getMentions().stream().anyMatch(m -> m.getMentionedUser() != null && m.getMentionedUser().getUsername().toLowerCase().contains(q))));
            if (hasCommentMatch) {
                score += 25.0;
            }
        }

        // Boost recency (up to 10 points)
        if (file.getUploadDate() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(file.getUploadDate(), LocalDateTime.now());
            if (days >= 0 && days < 30) {
                score += (30 - days) * (10.0 / 30.0);
            }
        }

        return score;
    }

    private List<String> findMatchedFields(FileMetadata file, String query, OcrContent ocr) {
        List<String> matches = new ArrayList<>();
        if (query == null || query.trim().isEmpty()) return matches;
        String q = query.toLowerCase();

        if (file.getFilename().toLowerCase().contains(q)) matches.add("filename");
        if (file.getTags() != null && file.getTags().toLowerCase().contains(q)) matches.add("tags");
        if (file.getCategory() != null && file.getCategory().toLowerCase().contains(q)) matches.add("category");
        if (ocr != null && ocr.getExtractedText() != null && ocr.getExtractedText().toLowerCase().contains(q)) matches.add("ocrContent");
        if (file.getComments() != null && file.getComments().stream().filter(c -> !c.isDeleted()).anyMatch(c -> (c.getContent() != null && c.getContent().toLowerCase().contains(q)) || (c.getMentions() != null && c.getMentions().stream().anyMatch(m -> m.getMentionedUser() != null && m.getMentionedUser().getUsername().toLowerCase().contains(q))))) {
            matches.add("comments");
        }

        return matches;
    }

    private String generateSnippetAndHighlight(String text, String query) {
        if (text == null || text.trim().isEmpty() || query == null || query.trim().isEmpty()) {
            return "";
        }
        String lowerText = text.toLowerCase();
        String lowerQuery = query.toLowerCase();
        int index = lowerText.indexOf(lowerQuery);
        if (index == -1) {
            return text.substring(0, Math.min(text.length(), snippetLength));
        }

        int start = Math.max(0, index - snippetLength / 2);
        int end = Math.min(text.length(), start + snippetLength);
        if (end == text.length()) {
            start = Math.max(0, end - snippetLength);
        }

        String snippet = text.substring(start, end);
        Pattern pattern = Pattern.compile("(?i)" + Pattern.quote(query));
        return pattern.matcher(snippet).replaceAll("<b>$0</b>");
    }

    private List<String> computeHighlights(FileMetadata file, String query) {
        List<String> highlights = new ArrayList<>();
        if (query == null || query.trim().isEmpty()) return highlights;

        String filename = file.getFilename();
        Pattern pattern = Pattern.compile("(?i)" + Pattern.quote(query));
        if (pattern.matcher(filename).find()) {
            highlights.add("filename: " + pattern.matcher(filename).replaceAll("<b>$0</b>"));
        }
        return highlights;
    }

    private int countOccurrences(String text, String word) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(word, index)) != -1) {
            count++;
            index += word.length();
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public SearchSuggestionDto getSuggestions(String username) {
        List<FileMetadata> files = fileRepository.findByUser_UsernameAndDeletedFalse(username);

        // Popular tags
        Map<String, Long> tagCounts = files.stream()
                .filter(f -> f.getTags() != null)
                .flatMap(f -> Arrays.stream(f.getTags().split(",")))
                .map(String::trim)
                .filter(t -> !t.isEmpty())
                .collect(Collectors.groupingBy(t -> t, Collectors.counting()));

        List<String> popularTags = tagCounts.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .map(Map.Entry::getKey)
                .limit(5)
                .collect(Collectors.toList());

        // Categories
        List<String> categories = files.stream()
                .map(FileMetadata::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .limit(5)
                .collect(Collectors.toList());

        // Owners
        List<String> owners = files.stream()
                .map(f -> f.getUser().getUsername())
                .distinct()
                .collect(Collectors.toList());

        return SearchSuggestionDto.builder()
                .recentQueries(getRecentQueries(username))
                .popularTags(popularTags)
                .categories(categories)
                .owners(owners)
                .build();
    }

    @Override
    public List<String> getRecentQueries(String username) {
        return recentQueriesMap.getOrDefault(username, new ArrayList<>());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getCategories(String username) {
        return fileRepository.findByUser_UsernameAndDeletedFalse(username).stream()
                .map(FileMetadata::getCategory)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public void recordQuery(String username, String query) {
        if (query == null || query.trim().isEmpty()) return;
        List<String> queries = recentQueriesMap.computeIfAbsent(username, k -> new ArrayList<>());
        queries.remove(query);
        queries.add(0, query);
        if (queries.size() > 10) {
            queries.remove(queries.size() - 1);
        }
    }

    @Override
    public void clearRecentQueries(String username) {
        recentQueriesMap.remove(username);
    }
}
