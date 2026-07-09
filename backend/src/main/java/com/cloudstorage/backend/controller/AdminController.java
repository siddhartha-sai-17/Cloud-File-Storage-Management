package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.AdminStatsDto;
import com.cloudstorage.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "Admin System Administration", description = "Endpoints for administrator analytics dashboard statistics")
public class AdminController {

    private final AdminService adminService;

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(
            summary = "Get global administration stats",
            description = "Retrieve summary metrics of users, files, storage footprints, and historical activity graphs (Requires Sysadmin role)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Admin dashboard statistics successfully retrieved"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<AdminStatsDto> getGlobalStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.getGlobalStats(userDetails.getUsername()));
    }
}
