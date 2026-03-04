// Structured logging utility for stress testing and debugging
// Helps track request flow through the system

export interface LogEntry {
  requestId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  action: string;
  commitmentId?: string;
  userId?: string;
  details?: Record<string, any>;
  error?: {
    code?: string;
    message: string;
  };
}

/**
 * Structured logger for edge functions
 * Includes request_id for tracing
 */
export class StructuredLogger {
  constructor(
    private requestId: string,
    private action: string,
    private userId?: string
  ) {}

  info(message: string, details?: Record<string, any>) {
    const entry: LogEntry = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      level: "info",
      action: this.action,
      userId: this.userId,
      details,
    };
    console.log(JSON.stringify(entry));
  }

  warn(message: string, details?: Record<string, any>) {
    const entry: LogEntry = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      level: "warn",
      action: this.action,
      userId: this.userId,
      details,
    };
    console.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error | any, details?: Record<string, any>) {
    const entry: LogEntry = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      level: "error",
      action: this.action,
      userId: this.userId,
      error: {
        message: error?.message || String(error),
        code: error?.code,
      },
      details,
    };
    console.error(JSON.stringify(entry));
  }

  logCommitment(
    commitmentId: string,
    statusBefore: string | null,
    statusAfter: string,
    details?: Record<string, any>
  ) {
    this.info(`commitment_status_change`, {
      commitmentId,
      statusBefore,
      statusAfter,
      ...details,
    });
  }

  logStripeAction(
    commitmentId: string,
    paymentIntentId: string,
    stripeAction: string,
    result: { success: boolean; error?: string }
  ) {
    this.info(`stripe_action`, {
      commitmentId,
      paymentIntentId,
      stripeAction,
      result,
    });
  }
}

/**
 * Audit log entry helper for database storage
 */
export async function auditLog(
  supabase: any,
  commitmentId: string,
  userId: string,
  requestId: string,
  action: string,
  statusBefore: string | null,
  statusAfter: string,
  stripeDetails?: {
    paymentIntentId?: string;
    stripeAction?: string;
    errorCode?: string;
    errorMessage?: string;
  },
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.from("commitment_audit_log").insert({
      commitment_id: commitmentId,
      user_id: userId,
      request_id: requestId,
      action,
      status_before: statusBefore,
      status_after: statusAfter,
      stripe_pi_id: stripeDetails?.paymentIntentId,
      stripe_action: stripeDetails?.stripeAction,
      stripe_error_code: stripeDetails?.errorCode,
      stripe_error_message: stripeDetails?.errorMessage,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (e) {
    console.error("Unexpected error writing audit log:", e);
  }
}

/**
 * Generate a request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
