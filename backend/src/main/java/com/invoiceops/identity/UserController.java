package com.invoiceops.identity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User Management", description = "Organisation user administration endpoints (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "List all users in current organisation")
    public ResponseEntity<List<UserDto>> listUsers() {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(userService.getUsersByOrganisation(orgId));
    }

    @PostMapping
    @Operation(summary = "Create a new user in current organisation")
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID adminId = SecurityUtils.getCurrentUserId();
        String adminEmail = SecurityUtils.getCurrentUserEmail();

        UserDto created = userService.createUser(request, orgId, adminId, adminEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Activate or deactivate a user account")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body
    ) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID adminId = SecurityUtils.getCurrentUserId();
        String adminEmail = SecurityUtils.getCurrentUserEmail();

        boolean active = Boolean.TRUE.equals(body.get("active"));
        UserDto updated = userService.updateUserStatus(id, active, orgId, adminId, adminEmail);
        return ResponseEntity.ok(updated);
    }
}
