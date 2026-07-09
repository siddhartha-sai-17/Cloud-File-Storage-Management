package com.cloudstorage.backend.security;

import com.cloudstorage.backend.entity.UploadSessionStatus;
import com.cloudstorage.backend.exception.InvalidUploadRequestException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Component
public class UploadSessionStateMachine {

    private final Map<UploadSessionStatus, Set<UploadSessionStatus>> allowedTransitions = new EnumMap<>(UploadSessionStatus.class);

    public UploadSessionStateMachine() {
        // Define all allowed state transitions
        allowedTransitions.put(UploadSessionStatus.INITIALIZED, EnumSet.of(
                UploadSessionStatus.UPLOADING,
                UploadSessionStatus.CANCELLED,
                UploadSessionStatus.EXPIRED,
                UploadSessionStatus.VERIFYING
        ));

        allowedTransitions.put(UploadSessionStatus.UPLOADING, EnumSet.of(
                UploadSessionStatus.PAUSED,
                UploadSessionStatus.FINALIZING,
                UploadSessionStatus.COMPLETED,
                UploadSessionStatus.FAILED,
                UploadSessionStatus.CANCELLED,
                UploadSessionStatus.EXPIRED,
                UploadSessionStatus.VERIFYING
        ));

        allowedTransitions.put(UploadSessionStatus.PAUSED, EnumSet.of(
                UploadSessionStatus.UPLOADING,
                UploadSessionStatus.CANCELLED,
                UploadSessionStatus.EXPIRED,
                UploadSessionStatus.VERIFYING
        ));

        allowedTransitions.put(UploadSessionStatus.VERIFYING, EnumSet.of(
                UploadSessionStatus.UPLOADING,
                UploadSessionStatus.PAUSED,
                UploadSessionStatus.FINALIZING,
                UploadSessionStatus.FAILED,
                UploadSessionStatus.CANCELLED,
                UploadSessionStatus.EXPIRED
        ));

        allowedTransitions.put(UploadSessionStatus.FINALIZING, EnumSet.of(
                UploadSessionStatus.COMPLETED,
                UploadSessionStatus.FAILED,
                UploadSessionStatus.CANCELLED,
                UploadSessionStatus.EXPIRED
        ));

        // Terminal states cannot transition to other states except possibly to EXPIRED in database audits,
        // but generally no transitions are allowed from terminal states.
        allowedTransitions.put(UploadSessionStatus.COMPLETED, EnumSet.noneOf(UploadSessionStatus.class));
        allowedTransitions.put(UploadSessionStatus.FAILED, EnumSet.noneOf(UploadSessionStatus.class));
        allowedTransitions.put(UploadSessionStatus.CANCELLED, EnumSet.noneOf(UploadSessionStatus.class));
        allowedTransitions.put(UploadSessionStatus.EXPIRED, EnumSet.noneOf(UploadSessionStatus.class));
    }

    /**
     * Validates if a transition from currentStatus to targetStatus is valid.
     * Throws InvalidUploadRequestException if the transition is invalid.
     */
    public void validateTransition(UploadSessionStatus currentStatus, UploadSessionStatus targetStatus) {
        if (currentStatus == targetStatus) {
            return; // No-op, same state
        }
        Set<UploadSessionStatus> targets = allowedTransitions.get(currentStatus);
        if (targets == null || !targets.contains(targetStatus)) {
            throw new InvalidUploadRequestException("Invalid upload session state transition from " 
                    + currentStatus + " to " + targetStatus);
        }
    }

    /**
     * Checks if transition is allowed without throwing exception.
     */
    public boolean isTransitionAllowed(UploadSessionStatus currentStatus, UploadSessionStatus targetStatus) {
        if (currentStatus == targetStatus) {
            return true;
        }
        Set<UploadSessionStatus> targets = allowedTransitions.get(currentStatus);
        return targets != null && targets.contains(targetStatus);
    }
}
