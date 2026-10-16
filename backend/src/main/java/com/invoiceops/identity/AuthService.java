package com.invoiceops.identity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.invoiceops.config.AppProperties;
import java.util.UUID;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final AppProperties appProperties;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository, AppProperties appProperties) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.appProperties = appProperties;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password())
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        InvoiceOpsUserDetails userDetails = (InvoiceOpsUserDetails) authentication.getPrincipal();
        User user = userRepository.findByIdWithOrganisation(userDetails.getUserId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in database"));

        return AuthResponse.success(UserDto.fromEntity(user, appProperties.isDemoMode()), "Authentication successful");
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUserDto() {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findByIdWithOrganisation(userId)
                .orElseThrow(() -> new IllegalStateException("Current user not found in database"));
        return UserDto.fromEntity(user, appProperties.isDemoMode());
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            new SecurityContextLogoutHandler().logout(request, response, auth);
        }
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
