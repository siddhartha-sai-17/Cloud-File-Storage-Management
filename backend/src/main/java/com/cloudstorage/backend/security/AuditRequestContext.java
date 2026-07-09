package com.cloudstorage.backend.security;

public class AuditRequestContext {

    private static final ThreadLocal<String> clientIp = new ThreadLocal<>();
    private static final ThreadLocal<String> userAgent = new ThreadLocal<>();

    public static void setClientIp(String ip) {
        clientIp.set(ip);
    }

    public static String getClientIp() {
        return clientIp.get();
    }

    public static void setUserAgent(String ua) {
        userAgent.set(ua);
    }

    public static String getUserAgent() {
        return userAgent.get();
    }

    public static void clear() {
        clientIp.remove();
        userAgent.remove();
    }
}
