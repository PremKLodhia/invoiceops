package com.invoiceops.invoice;

import com.invoiceops.extraction.ConfidenceLevel;
import com.invoiceops.extraction.FieldSource;
import java.time.Instant;
import java.util.UUID;

public record ExtractionFieldDto(
        UUID id,
        String fieldName,
        String extractedValue,
        String correctedValue,
        ConfidenceLevel confidence,
        FieldSource source,
        String correctedByEmail,
        Instant correctedAt
) {
    public static ExtractionFieldDto fromEntity(ExtractionField field) {
        return new ExtractionFieldDto(
                field.getId(),
                field.getFieldName(),
                field.getExtractedValue(),
                field.getCorrectedValue(),
                field.getConfidence(),
                field.getSource(),
                field.getCorrectedBy() != null ? field.getCorrectedBy().getEmail() : null,
                field.getCorrectedAt()
        );
    }
}
