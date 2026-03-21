package com.cloudstorage.backend.dto;

import lombok.Data;

public class AuthDto {
    @Data
    public static class Request {
        private String username;
        private String password;
        private String email;
    }

    @Data
    public static class Response {
        private String token;

        public Response(String token) {
            this.token = token;
        }
    }
}
