package com.aicompiler.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient judge0WebClient() {
        // Self-hosted Judge0 instance - base URL set here so Judge0Client
        // only needs to pass relative paths like "/submissions".
        return WebClient.builder()
                .baseUrl("https://judge0.cloudops.terv.pro")
                .build();
    }

    @Bean
    public WebClient aiWebClient(@Value("${ai.api.base-url}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}