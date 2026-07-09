package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.ShareLink;
import com.cloudstorage.backend.entity.SharedUser;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedUserRepository extends JpaRepository<SharedUser, Long> {

    Optional<SharedUser> findByShareLinkAndUser(ShareLink shareLink, User user);

    Optional<SharedUser> findByShareLinkIdAndUserUsername(UUID shareLinkId, String username);

    List<SharedUser> findByUserUsername(String username);

    List<SharedUser> findByShareLinkId(UUID shareLinkId);

    void deleteByShareLinkId(UUID shareLinkId);

    @Query("SELECT su.shareLink FROM SharedUser su WHERE su.user.username = :username AND su.shareLink.active = true")
    List<ShareLink> findActiveLinksSharedWithUser(String username);
}
