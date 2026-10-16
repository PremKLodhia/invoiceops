package com.invoiceops.reporting;

import java.math.BigDecimal;

public record CurrencyTotalDto(
        String currency,
        BigDecimal totalAmount,
        long count
) {
}
