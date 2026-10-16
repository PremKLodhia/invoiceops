package com.invoiceops.identity;

import com.invoiceops.audit.AuditService;
import com.invoiceops.config.ResourceNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final OrganisationRepository organisationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(
            UserRepository userRepository,
            OrganisationRepository organisationRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.organisationRepository = organisationRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<UserDto> getUsersByOrganisation(UUID orgId) {
        return userRepository.findByOrganisationId(orgId).stream()
                .map(UserDto::fromEntity)
                .toList();
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request, UUID orgId, UUID adminUserId, String adminEmail) {
        if (userRepository.findByEmail(request.email().trim().toLowerCase()).isPresent()) {
            throw new IllegalArgumentException("User with email " + request.email() + " already exists");
        }

        Organisation org = organisationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organisation", "id", orgId));

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(
                org,
                request.email().trim().toLowerCase(),
                passwordHash,
                request.fullName().trim(),
                request.role()
        );

        User saved = userRepository.save(user);

        auditService.logEvent(
                orgId,
                adminUserId,
                adminEmail,
                "USER_CREATED",
                "USER",
                saved.getId(),
                Map.of("email", saved.getEmail(), "role", saved.getRole().name())
        );

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateUserStatus(UUID userId, boolean active, UUID orgId, UUID adminUserId, String adminEmail) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getOrganisation().getId().equals(orgId))
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!active && userId.equals(adminUserId)) {
            throw new IllegalArgumentException("Administrators cannot deactivate their own account");
        }

        user.setActive(active);
        User saved = userRepository.save(user);

        auditService.logEvent(
                orgId,
                adminUserId,
                adminEmail,
                "USER_STATUS_UPDATED",
                "USER",
                saved.getId(),
                Map.of("active", active, "email", saved.getEmail())
        );

        return UserDto.fromEntity(saved);
    }
}
