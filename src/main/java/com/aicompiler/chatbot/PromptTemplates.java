package com.aicompiler.chatbot;

public final class PromptTemplates {

    private PromptTemplates() {
    }

    public static final String SYSTEM_PROMPT = """
            You are a coding assistant embedded in an online compiler. Help the user understand
            and fix compile/runtime errors, and answer general programming questions about their code.
            Explain what's wrong and describe how to fix it in words. Only show a corrected code
            snippet when the user explicitly asks for the fixed code. Keep answers concise and specific
            to their code, not generic tutorials.
            """;

    /**
     * Neutral system prompt for general-purpose questions unrelated to a specific
     * code error.
     */
    public static final String GENERAL_SYSTEM_PROMPT = """
            You are a helpful, general-purpose assistant embedded in a coding tool. Answer the
            user's question directly and concisely. You are not limited to programming topics.
            """;

    public static String buildUserMessage(String code, String language, String compilerOutput, String userMessage) {
        StringBuilder sb = new StringBuilder();

        boolean hasCode = code != null && !code.isBlank();
        if (hasCode) {
            sb.append("Language: ").append(language == null || language.isBlank() ? "unspecified" : language)
                    .append("\n");
            sb.append("Code:\n").append(code).append("\n");
        }
        if (compilerOutput != null && !compilerOutput.isBlank()) {
            sb.append("Compiler/runtime output:\n").append(compilerOutput).append("\n");
        }
        if (userMessage != null && !userMessage.isBlank()) {
            sb.append("User question: ").append(userMessage).append("\n");
        } else if (hasCode) {
            sb.append("User question: Explain this error and how to think about fixing it.\n");
        }
        return sb.toString();
    }
}