package com.invoiceops.document;

public record StoredDocument(
        String originalFilename,
        String storedFilename,
        String fileHash,
        long fileSize,
        String contentType
) {
}
