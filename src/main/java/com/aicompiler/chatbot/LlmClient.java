package com.aicompiler.chatbot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around OpenRouter's OpenAI-compatible /chat/completions API.
 * OpenRouter gives access to many models (Claude, GPT, Llama, etc.) through one
 * key - just change ai.api.model in application.properties to switch models.
 * Docs: https://openrouter.ai/docs
 */
@Component
public class LlmClient {

    private final WebClient webClient;
    private final String apiKey;
    private final String model;
    private final String siteUrl;
    private final String siteName;

    public LlmClient(WebClient aiWebClient,
            @Value("${ai.api.key}") String apiKey,
            @Value("${ai.api.model}") String model,
            @Value("${ai.api.site-url:http://localhost:8080}") String siteUrl,
            @Value("${ai.api.site-name:AI Compiler Assistant}") String siteName) {
        this.webClient = aiWebClient;
        this.apiKey = apiKey;
        this.model = model;
        this.siteUrl = siteUrl;
        this.siteName = siteName;
    }

    @SuppressWarnings("unchecked")
    public String send(String systemPrompt, List<Map<String, String>> messages) {
        // OpenRouter/OpenAI format expects the system prompt as the first message
        // in the same "messages" array, not as a separate top-level field.
        List<Map<String, String>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of("role", "system", "content", systemPrompt));
        fullMessages.addAll(messages);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", fullMessages);

        Map<String, Object> response = webClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                // Optional but recommended by OpenRouter for their leaderboard/analytics:
                .header("HTTP-Referer", siteUrl)
                .header("X-Title", siteName)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null || response.get("choices") == null) {
            return "Sorry, I couldn't process that right now. Please try again.";
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices.isEmpty()) {
            return "Sorry, I couldn't process that right now. Please try again.";
        }

        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }
}