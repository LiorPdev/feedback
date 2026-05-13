/**
 * Unified event-based utility to trigger the registration/auth gate modal from anywhere in the app.
 * This ensures only a single instance of the modal is managed by the Navbar.
 */
import { GateType } from "@/components/RegistrationGate";

export interface RegistrationGateOptions {
  type: GateType;
  redirectUrl?: string;
  userEmail?: string;
  forceShowForm?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function openRegistrationGate(options: RegistrationGateOptions) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-registration-gate", {
      detail: options
    }));
  }
}
