package com.aicompiler.chatbot.dto;

public record ChatResponse(
        String reply,
        String errorType   // e.g. "SyntaxError", "NullPointerException", null if none detected
) {}
