package com.aicompiler.compiler;

import com.aicompiler.chatbot.ChatbotService;
import com.aicompiler.chatbot.dto.ChatRequest;
import com.aicompiler.chatbot.dto.ChatResponse;
import com.aicompiler.compiler.dto.SubmissionRequest;
import com.aicompiler.compiler.dto.SubmissionResult;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CompilerService {

    private final Judge0Client judge0Client;
    private final ChatbotService chatbotService;

    public CompilerService(
            Judge0Client judge0Client,
            ChatbotService chatbotService) {

        this.judge0Client = judge0Client;
        this.chatbotService = chatbotService;
    }

    public SubmissionResult run(SubmissionRequest request) {

        SubmissionResult result = judge0Client.submit(request);

        if (!result.hasError()) {
            return result;
        }

        // Each compile call gets its own session id so different users'
        // error/chat threads never collide.
        String sessionId = "compiler-" + UUID.randomUUID();

        ChatRequest chatRequest = new ChatRequest(
                sessionId,
                request.sourceCode(),
                request.language(),
                result.compileOutput() != null
                        ? result.compileOutput()
                        : result.stderr(),
                "Explain this error and show how to fix it.");

        ChatResponse aiResponse = chatbotService.chat(chatRequest);

        return new SubmissionResult(
                result.stdout(),
                result.stderr(),
                result.compileOutput(),
                result.status(),
                aiResponse.reply());
    }
}