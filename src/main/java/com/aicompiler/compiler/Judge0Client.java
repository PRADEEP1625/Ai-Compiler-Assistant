package com.aicompiler.compiler;

import com.aicompiler.compiler.dto.SubmissionRequest;
import com.aicompiler.compiler.dto.SubmissionResult;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Component
public class Judge0Client {

    private static final String JUDGE0_BASE_URL = "https://judge0.cloudops.terv.pro";

    private static final int MAX_POLL_ATTEMPTS = 15;
    private static final long POLL_DELAY_MS = 1000;

    private static final int STATUS_IN_QUEUE = 1;
    private static final int STATUS_PROCESSING = 2;

    private static final Map<String, Integer> LANGUAGE_IDS = Map.of(
            "java", 62,
            "python", 71,
            "javascript", 63,
            "c", 50,
            "cpp", 54);

    private final WebClient webClient;

    public Judge0Client(WebClient judge0WebClient) {
        this.webClient = judge0WebClient;
    }

    @SuppressWarnings("unchecked")
    public SubmissionResult submit(SubmissionRequest request) {
        String language = request.language() == null ? "" : request.language().toLowerCase();
        Integer languageId = LANGUAGE_IDS.get(language);

        if (languageId == null) {
            return new SubmissionResult(
                    null,
                    "Unsupported language: " + request.language(),
                    null,
                    "Unsupported Language",
                    null);
        }

        Map<String, Object> body = Map.of(
                "language_id", languageId,
                "source_code", request.sourceCode() == null ? "" : request.sourceCode(),
                "stdin", request.stdin() == null ? "" : request.stdin());

        try {
            Map<String, Object> submitResponse = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/submissions")
                            .queryParam("base64_encoded", "false")
                            .build())
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (submitResponse == null || submitResponse.get("token") == null) {
                return new SubmissionResult(
                        null,
                        "Judge0 did not return a submission token.",
                        null,
                        "Execution Error",
                        null);
            }

            String token = (String) submitResponse.get("token");

            Map<String, Object> result = null;
            for (int attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
                result = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/submissions/" + token)
                                .queryParam("base64_encoded", "false")
                                .build())
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<String, Object> statusObj = result != null ? (Map<String, Object>) result.get("status") : null;
                Integer statusId = statusObj != null ? (Integer) statusObj.get("id") : null;

                boolean stillRunning = statusId != null
                        && (statusId == STATUS_IN_QUEUE || statusId == STATUS_PROCESSING);

                if (!stillRunning) {
                    break;
                }

                Thread.sleep(POLL_DELAY_MS);
            }

            if (result == null) {
                return new SubmissionResult(
                        null,
                        "Judge0 did not return a result after polling.",
                        null,
                        "Execution Error",
                        null);
            }

            String stdout = (String) result.get("stdout");
            String stderr = (String) result.get("stderr");
            String compileOutput = (String) result.get("compile_output");
            String message = (String) result.get("message");

            Map<String, Object> statusObj = (Map<String, Object>) result.get("status");
            Integer statusId = statusObj != null ? (Integer) statusObj.get("id") : null;
            String statusDescription = statusObj != null ? (String) statusObj.get("description") : "Unknown";

            String status;
            if (statusId == null) {
                status = "Unknown Error";
            } else if (statusId == 3) {
                status = "Accepted";
            } else if (statusId == 6) {
                status = "Compilation Error";
            } else if (statusId == STATUS_IN_QUEUE || statusId == STATUS_PROCESSING) {
                status = "Timed Out";
            } else {
                status = "Runtime Error";
            }

            String combinedStderr = stderr;
            if (message != null && !message.isBlank()) {
                combinedStderr = (combinedStderr == null ? "" : combinedStderr + "\n") + message;
            }
            if (statusId != null && statusId != 3 && statusId != 6) {
                combinedStderr = (combinedStderr == null ? "" : combinedStderr + "\n") + statusDescription;
            }

            return new SubmissionResult(
                    stdout,
                    combinedStderr,
                    compileOutput,
                    status,
                    null);

        } catch (Exception ex) {
            return new SubmissionResult(
                    null,
                    "Could not reach the code execution server: " + ex.getMessage(),
                    null,
                    "Execution Error",
                    null);
        }
    }
}