package com.invoiceops.extraction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class OllamaExtractionAdapter {

    private static final Logger log = LoggerFactory.getLogger(OllamaExtractionAdapter.class);
    private static final String OLLAMA_DEFAULT_URL = "http://localhost:11434/api/tags";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(500))
            .build();

    public boolean isAvailable() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(OLLAMA_DEFAULT_URL))
                    .timeout(Duration.ofMillis(500))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.debug("Ollama is not reachable locally: {}", e.getMessage());
            return false;
        }
    }

    public ParsedInvoiceData extractWithAi(String text) {
        if (!isAvailable()) {
            return null;
        }
        // If Ollama is online, could invoke local llama model; falls back to deterministic parser
        return null;
    }
}
