package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.SearchRequestDto;
import com.cloudstorage.backend.dto.SearchResultDto;
import com.cloudstorage.backend.dto.SearchSuggestionDto;
import com.cloudstorage.backend.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<Page<SearchResultDto>> searchGet(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("query") String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sortBy", defaultValue = "filename") String sortBy,
            @RequestParam(value = "direction", defaultValue = "asc") String direction) {

        SearchRequestDto request = SearchRequestDto.builder()
                .query(query)
                .page(page)
                .size(size)
                .sortBy(sortBy)
                .direction(direction)
                .build();

        return ResponseEntity.ok(searchService.search(userDetails.getUsername(), request));
    }

    @PostMapping
    public ResponseEntity<Page<SearchResultDto>> searchPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SearchRequestDto request) {

        return ResponseEntity.ok(searchService.search(userDetails.getUsername(), request));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<SearchSuggestionDto> suggestions(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(searchService.getSuggestions(userDetails.getUsername()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<String>> recent(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(searchService.getRecentQueries(userDetails.getUsername()));
    }

    @DeleteMapping("/recent")
    public ResponseEntity<Void> clearRecent(@AuthenticationPrincipal UserDetails userDetails) {
        searchService.clearRecentQueries(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> categories(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(searchService.getCategories(userDetails.getUsername()));
    }
}
