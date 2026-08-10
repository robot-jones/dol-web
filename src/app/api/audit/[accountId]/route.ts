import { NextRequest, NextResponse } from "next/server";
import type { ActionContext, ClientAction } from "@erikmuir/dol-lib/types";
import { auditClient } from "@erikmuir/dol-lib/server/dynamo";
import { verifyClientAction } from "@erikmuir/dol-lib/server/dapp";
import { badRequest, StandardPayload, success } from "@/utils";

// /api/audit/[accountId]
//
// The browser isn't a trustworthy witness to its own transactions - see
// PUNCHLIST.md Finding 14. This used to write whatever `action`/`success`/
// `context` a client sent straight to `dol-audit-logs`, which meant anyone
// on the site (no exploit needed, just devtools) could plant a fabricated
// entry under any accountId, including the treasury's own. Now: only the
// two actions a client is ever legitimate to report get through at all,
// only the context fields relevant to each are kept, and `success` is
// re-derived from `verifyClientAction` (a real claim record + mirror node
// check) rather than trusted from the request body. A request that doesn't
// correspond to a real claim/association is rejected outright - not logged
// as a fabricated failure, since it isn't a failed attempt at all.

const CLIENT_ACTIONS: ClientAction[] = ["NFT_PURCHASE", "TOKEN_ASSOCIATE"];
const hederaIdPattern = /^\d+\.\d+\.\d+$/;

const CONTEXT_KEYS_BY_ACTION: Record<ClientAction, (keyof ActionContext)[]> = {
  NFT_PURCHASE: ["tokenId", "serial", "showDate", "position", "error"],
  TOKEN_ASSOCIATE: ["tokenId", "error"],
};

const sanitizeContext = (action: ClientAction, rawContext: unknown): ActionContext => {
  const raw = (rawContext && typeof rawContext === "object" ? rawContext : {}) as Record<string, unknown>;
  const sanitized: Record<string, string | number> = {};
  for (const key of CONTEXT_KEYS_BY_ACTION[action]) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    if (key === "serial" || key === "position") {
      const num = Number(value);
      if (Number.isFinite(num)) sanitized[key] = num;
    } else {
      sanitized[key] = String(value).slice(0, 500);
    }
  }
  return sanitized as ActionContext;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse<StandardPayload<boolean | string>>> {
  const accountId = (await params).accountId;
  if (!hederaIdPattern.test(accountId)) {
    return badRequest("Invalid accountId");
  }

  const body = (await req.json().catch(() => null)) as { action?: string; context?: unknown } | null;
  const action = body?.action;
  if (!CLIENT_ACTIONS.includes(action as ClientAction)) {
    return badRequest("Invalid action");
  }

  const context = sanitizeContext(action as ClientAction, body?.context);
  const verification = await verifyClientAction(action as ClientAction, accountId, context);
  if (!verification.accepted) {
    console.warn("Rejected client audit log write:", { accountId, action, context, reason: verification.reason });
    return badRequest(verification.reason);
  }

  await auditClient({
    action: action as ClientAction,
    success: verification.success,
    accountId,
    context,
  });
  return success(true);
}
