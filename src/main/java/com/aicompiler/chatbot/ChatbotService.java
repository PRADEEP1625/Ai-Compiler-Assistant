package com.aicompiler.chatbot;

import com.aicompiler.chatbot.dto.ChatRequest;
import com.aicompiler.chatbot.dto.ChatResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatbotService {

    private final LlmClient llmClient;
    private final ErrorParserService errorParserService;

    // sessionId -> conversation history. Replace with DB-backed storage for
    // production.
    private final Map<String, List<Map<String, String>>> sessionHistory = new ConcurrentHashMap<>();

    public ChatbotService(LlmClient llmClient, ErrorParserService errorParserService) {
        this.llmClient = llmClient;
        this.errorParserService = errorParserService;
    }

    /**
     * Code-error-focused chat: explains a compile/runtime error for the given code.
     */
    public ChatResponse chat(ChatRequest request) {
        List<Map<String, String>> history = historyFor(request.sessionId());

        String userMessage = PromptTemplates.buildUserMessage(
                request.code(), request.language(), request.compilerOutput(), request.userMessage());

        String reply = sendAndRecord(history, PromptTemplates.SYSTEM_PROMPT, userMessage);

        String errorType = errorParserService.detectErrorType(request.compilerOutput());
        return new ChatResponse(reply, errorType);
    }

    /**
     * General-purpose chat for questions unrelated to a specific code error —
     * skips the "Language:/Code:/Compiler output:" framing entirely and uses
     * a neutral system prompt. Still reuses the same session history map, so
     * a user can freely mix code-help and general questions in one session.
     */
    public ChatResponse generalChat(String sessionId, String userMessage) {
        List<Map<String, String>> history = historyFor(sessionId);

        String reply = sendAndRecord(history, PromptTemplates.GENERAL_SYSTEM_PROMPT, userMessage);

        return new ChatResponse(reply, null);
    }

    private List<Map<String, String>> historyFor(String sessionId) {
        return sessionHistory.computeIfAbsent(sessionId, id -> new CopyOnWriteArrayList<>());
    }

    private String sendAndRecord(List<Map<String, String>> history, String systemPrompt, String userMessage) {
        history.add(Map.of("role", "user", "content", userMessage));
        String reply = llmClient.send(systemPrompt, history);
        history.add(Map.of("role", "assistant", "content", reply));
        return reply;
    }
}