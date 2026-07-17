package com.aicompiler.chatbot.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatRequest(
                @NotBlank String sessionId,
                String code, // nullable/blank for general questions unrelated to any code
                String language,
                String compilerOutput, // stderr/compileOutput from the compiler run, nullable
                String userMessage // nullable if auto-triggered right after an error
) {
}