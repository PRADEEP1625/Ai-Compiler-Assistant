package com.aicompiler.compiler.dto;

public record SubmissionResult(
        String stdout,
        String stderr,
        String compileOutput,
        String status, // "Accepted", "Compilation Error", or "Runtime Error"
        String aiReply // AI explanation (null if no error)
) {
    public boolean hasError() {
        return !"Accepted".equals(status);
    }
}