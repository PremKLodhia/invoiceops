package com.invoiceops.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u JOIN FETCH u.organisation WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("SELECT u FROM User u JOIN FETCH u.organisation WHERE u.id = :id")
    Optional<User> findByIdWithOrganisation(@Param("id") UUID id);

    List<User> findByOrganisationId(UUID organisationId);

    Optional<User> findByIdAndOrganisationId(UUID id, UUID organisationId);

    boolean existsByEmailIgnoreCase(String email);
}
