import { NextRequest, NextResponse } from "next/server";
import { acceptTerms } from "@erikmuir/dol-lib/server/dynamo";
import { badRequest, LEGAL_TERMS_UPDATED, StandardPayload, success } from "@/utils";

// /api/account/[accountId]/accept-terms
//
// Records that this account has accepted the Terms of Service/Privacy
// Policy currently in effect. The version recorded is always the server's
// own LEGAL_TERMS_UPDATED - never taken from the request body - so a
// caller can't assert agreement to a version other than what's actually
// live right now. dol-lib's acceptTerms is idempotent per version: a
// repeat call for an account already on record for this version is a safe
// no-op, not a new consent event.

const hederaIdPattern = /^\d+\.\d+\.\d+$/;

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse<StandardPayload<boolean | string>>> {
  const { accountId } = await params;
  if (!hederaIdPattern.test(accountId)) {
    return badRequest("Invalid accountId");
  }

  const result = await acceptTerms(accountId, LEGAL_TERMS_UPDATED);
  return success(result.success);
}
