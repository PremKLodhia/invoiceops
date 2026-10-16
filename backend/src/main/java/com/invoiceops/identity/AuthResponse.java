package com.invoiceops.identity;

public record AuthResponse(
        UserDto user,
        String status,
        String message
) {
    public static AuthResponse success(UserDto user, String message) {
        return new AuthResponse(user, "SUCCESS", message);
    }

    public static AuthResponse error(String message) {
        return new AuthResponse(null, "ERROR", message);
    }
}
