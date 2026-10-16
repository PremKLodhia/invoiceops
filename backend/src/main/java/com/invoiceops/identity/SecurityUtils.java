package com.invoiceops.identity;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<InvoiceOpsUserDetails> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof InvoiceOpsUserDetails userDetails) {
            return Optional.of(userDetails);
        }

        return Optional.empty();
    }

    public static InvoiceOpsUserDetails getRequiredCurrentUser() {
        return getCurrentUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("User is not authenticated in current security context"));
    }

    public static UUID getCurrentUserId() {
        return getRequiredCurrentUser().getUserId();
    }

    public static UUID getCurrentOrganisationId() {
        UUID orgId = getRequiredCurrentUser().getOrganisationId();
        if (orgId == null) {
            throw new AccessDeniedException("User is not assigned to an active organisation");
        }
        return orgId;
    }

    public static String getCurrentUserEmail() {
        return getRequiredCurrentUser().getUsername();
    }

    public static UserRole getCurrentUserRole() {
        return getRequiredCurrentUser().getRole();
    }
}
