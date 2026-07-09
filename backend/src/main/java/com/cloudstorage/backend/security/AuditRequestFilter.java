package com.cloudstorage.backend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuditRequestFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            
            String ip = httpRequest.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = httpRequest.getRemoteAddr();
            } else {
                int firstComma = ip.indexOf(",");
                if (firstComma != -1) {
                    ip = ip.substring(0, firstComma).trim();
                }
            }
            
            String ua = httpRequest.getHeader("User-Agent");
            
            AuditRequestContext.setClientIp(ip);
            AuditRequestContext.setUserAgent(ua);
        }
        try {
            chain.doFilter(request, response);
        } finally {
            AuditRequestContext.clear();
        }
    }
}
