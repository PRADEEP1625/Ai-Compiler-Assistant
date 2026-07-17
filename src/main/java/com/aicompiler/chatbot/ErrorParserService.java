package com.aicompiler.chatbot;

import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ErrorParserService {

    // Java/generic runtime exceptions, e.g. "Exception in thread "main" java.lang.NullPointerException"
    private static final Pattern EXCEPTION_PATTERN = Pattern.compile("([a-zA-Z.]+Exception|[a-zA-Z.]+Error)");
    // Generic "line 12" / ":12:" style line references
    private static final Pattern LINE_NUMBER_PATTERN = Pattern.compile("(?:line[:\\s]*|:)(\\d+)");

    public String detectErrorType(String compilerOutput) {
        if (compilerOutput == null || compilerOutput.isBlank()) {
            return null;
        }
        Matcher matcher = EXCEPTION_PATTERN.matcher(compilerOutput);
        if (matcher.find()) {
            return matcher.group(1);
        }
        String lower = compilerOutput.toLowerCase();
        if (lower.contains("syntax error") || lower.contains("expected")) {
            return "SyntaxError";
        }
        return "UnknownError";
    }

    public Integer detectLineNumber(String compilerOutput) {
        if (compilerOutput == null) return null;
        Matcher matcher = LINE_NUMBER_PATTERN.matcher(compilerOutput);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
