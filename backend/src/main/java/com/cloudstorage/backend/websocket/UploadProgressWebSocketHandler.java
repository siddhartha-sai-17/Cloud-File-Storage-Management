package com.cloudstorage.backend.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cloudstorage.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;

@Component
@RequiredArgsConstructor
public class UploadProgressWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(UploadProgressWebSocketHandler.class);

    private final ProgressSubscriptionManager subscriptionManager;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String token = extractToken(uri);
        if (token == null) {
            logger.warn("WebSocket connection rejected: token missing");
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Token is required"));
            return;
        }

        try {
            String username = jwtUtil.extractUsername(token);
            if (username == null) {
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Invalid token"));
                return;
            }
            session.getAttributes().put("username", username);
            logger.info("WebSocket connection established for user: {}", username);
        } catch (Exception e) {
            logger.warn("WebSocket connection rejected: invalid token", e);
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Invalid token"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            JsonNode jsonNode = objectMapper.readTree(message.getPayload());
            String action = jsonNode.has("action") ? jsonNode.get("action").asText() : null;
            String sessionId = jsonNode.has("sessionId") ? jsonNode.get("sessionId").asText() : null;

            if (action == null || sessionId == null) {
                session.sendMessage(new TextMessage("{\"error\":\"Invalid message format. Action and sessionId required.\"}"));
                return;
            }

            if ("subscribe".equalsIgnoreCase(action)) {
                subscriptionManager.subscribe(sessionId, session);
                session.sendMessage(new TextMessage("{\"status\":\"subscribed\",\"sessionId\":\"" + sessionId + "\"}"));
            } else if ("unsubscribe".equalsIgnoreCase(action)) {
                subscriptionManager.unsubscribe(sessionId, session);
                session.sendMessage(new TextMessage("{\"status\":\"unsubscribed\",\"sessionId\":\"" + sessionId + "\"}"));
            } else {
                session.sendMessage(new TextMessage("{\"error\":\"Unknown action: " + action + "\"}"));
            }
        } catch (Exception e) {
            logger.error("Error handling WebSocket text message", e);
            session.sendMessage(new TextMessage("{\"error\":\"Failed to process message: " + e.getMessage() + "\"}"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        subscriptionManager.unsubscribeAll(session);
        logger.info("WebSocket connection closed for session: {}, status: {}", session.getId(), status);
    }

    private String extractToken(URI uri) {
        if (uri == null || uri.getQuery() == null) return null;
        for (String param : uri.getQuery().split("&")) {
            String[] pair = param.split("=");
            if (pair.length > 1 && "token".equals(pair[0])) {
                return pair[1];
            }
        }
        return null;
    }
}
