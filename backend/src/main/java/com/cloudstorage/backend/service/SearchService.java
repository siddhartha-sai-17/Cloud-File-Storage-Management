package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.SearchRequestDto;
import com.cloudstorage.backend.dto.SearchResultDto;
import com.cloudstorage.backend.dto.SearchSuggestionDto;
import org.springframework.data.domain.Page;
import java.util.List;

public interface SearchService {

    Page<SearchResultDto> search(String username, SearchRequestDto request);

    SearchSuggestionDto getSuggestions(String username);

    List<String> getRecentQueries(String username);

    List<String> getCategories(String username);

    void recordQuery(String username, String query);

    void clearRecentQueries(String username);
}
