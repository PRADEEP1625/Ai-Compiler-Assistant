package com.aicompiler.compiler.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmissionRequest(
        @NotBlank String sourceCode,
        @NotBlank String language,   // Piston language name, e.g. "java", "python", "javascript"
        String stdin
) {}
