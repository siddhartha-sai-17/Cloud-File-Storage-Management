package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.AuthDto;
import com.cloudstorage.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthDto.Response> register(@RequestBody AuthDto.Request request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.Response> login(@RequestBody AuthDto.Request request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
