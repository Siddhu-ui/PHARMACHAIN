from typing import Tuple, List

class BatchStatus:
    REGISTERED = "REGISTERED"
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    EXPIRED = "EXPIRED"
    RETURN_REQUESTED = "RETURN_REQUESTED"
    PICKUP_CONFIRMED = "PICKUP_CONFIRMED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED_BY_MANUFACTURER = "RECEIVED_BY_MANUFACTURER"
    AWAITING_DESTRUCTION = "AWAITING_DESTRUCTION"
    DESTRUCTION_VERIFIED = "DESTRUCTION_VERIFIED"
    CLOSED = "CLOSED"
    SUSPICIOUS = "SUSPICIOUS"
    REENTRY_DETECTED = "REENTRY_DETECTED"

# Legal forward transitions in standard reverse logistics flow
VALID_TRANSITIONS = {
    BatchStatus.REGISTERED: [BatchStatus.ACTIVE, BatchStatus.EXPIRING_SOON, BatchStatus.EXPIRED, BatchStatus.SUSPICIOUS],
    BatchStatus.ACTIVE: [BatchStatus.EXPIRING_SOON, BatchStatus.EXPIRED, BatchStatus.SUSPICIOUS],
    BatchStatus.EXPIRING_SOON: [BatchStatus.EXPIRED, BatchStatus.RETURN_REQUESTED, BatchStatus.SUSPICIOUS],
    BatchStatus.EXPIRED: [BatchStatus.RETURN_REQUESTED, BatchStatus.SUSPICIOUS],
    BatchStatus.RETURN_REQUESTED: [BatchStatus.PICKUP_CONFIRMED, BatchStatus.SUSPICIOUS],
    BatchStatus.PICKUP_CONFIRMED: [BatchStatus.IN_TRANSIT, BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.SUSPICIOUS],
    BatchStatus.IN_TRANSIT: [BatchStatus.RECEIVED_BY_MANUFACTURER, BatchStatus.SUSPICIOUS],
    BatchStatus.RECEIVED_BY_MANUFACTURER: [BatchStatus.AWAITING_DESTRUCTION, BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.SUSPICIOUS],
    BatchStatus.AWAITING_DESTRUCTION: [BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.SUSPICIOUS],
    BatchStatus.DESTRUCTION_VERIFIED: [BatchStatus.CLOSED, BatchStatus.REENTRY_DETECTED],
    BatchStatus.CLOSED: [BatchStatus.REENTRY_DETECTED],
    BatchStatus.SUSPICIOUS: [BatchStatus.CLOSED, BatchStatus.REENTRY_DETECTED, BatchStatus.RETURN_REQUESTED],
    BatchStatus.REENTRY_DETECTED: [BatchStatus.CLOSED],
}

class StateMachineError(Exception):
    pass

class BatchStateMachine:
    @staticmethod
    def can_transition(current_status: str, target_status: str) -> bool:
        if current_status == target_status:
            return True
        allowed = VALID_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @staticmethod
    def validate_transition(current_status: str, target_status: str) -> None:
        if not BatchStateMachine.can_transition(current_status, target_status):
            raise StateMachineError(
                f"Illegal state transition from '{current_status}' to '{target_status}'. "
                f"Allowed transitions are: {VALID_TRANSITIONS.get(current_status, [])}"
            )

    @staticmethod
    def is_destroyed_or_closed(status: str) -> bool:
        return status in [BatchStatus.DESTRUCTION_VERIFIED, BatchStatus.CLOSED]

    @staticmethod
    def is_return_eligible(status: str) -> bool:
        return status in [BatchStatus.EXPIRED, BatchStatus.EXPIRING_SOON, BatchStatus.ACTIVE]
