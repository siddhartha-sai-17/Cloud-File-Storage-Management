package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuthDto;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthDto.Response register(AuthDto.Request request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthDto.Response(token);
    }

    public AuthDto.Response login(AuthDto.Request request) {
        // Support login via email OR username
        String loginId = request.getUsername() != null ? request.getUsername() : request.getEmail();

        // Resolve real username (in case user logged in with email)
        User user = userRepository.findByUsername(loginId)
                .or(() -> userRepository.findByEmail(loginId))
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        // Authenticate with the resolved username
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword()));
        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthDto.Response(token);
    }
}
