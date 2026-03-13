export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  buildSubscriptionAnalytics,
  cancelSubscription,
  convertTrial,
  processBillingRetries,
  sendTrialConversionReminder,
  startTrial
} from "@/lib/subscriptionLifecycle";

export async function GET() {
  const analytics = await buildSubscriptionAnalytics();
  return NextResponse.json(analytics);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload.action !== "string") {
    return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });
  }

  switch (payload.action) {
    case "start_trial": {
      if (typeof payload.userId !== "string" || payload.userId.trim().length === 0) {
        return NextResponse.json({ error: "userId is required." }, { status: 400 });
      }
      const subscription = await startTrial({
        userId: payload.userId,
        planId: typeof payload.planId === "string" ? payload.planId : undefined,
        priceCents: typeof payload.priceCents === "number" ? payload.priceCents : undefined,
        currency: typeof payload.currency === "string" ? payload.currency : undefined,
        trialDays: typeof payload.trialDays === "number" ? payload.trialDays : undefined,
        autoConvertOptIn: typeof payload.autoConvertOptIn === "boolean" ? payload.autoConvertOptIn : undefined,
        now: typeof payload.now === "string" ? payload.now : undefined
      });
      return NextResponse.json({ subscription }, { status: 201 });
    }

    case "send_reminder": {
      if (typeof payload.subscriptionId !== "string") {
        return NextResponse.json({ error: "subscriptionId is required." }, { status: 400 });
      }
      const subscription = await sendTrialConversionReminder(payload.subscriptionId, {
        now: typeof payload.now === "string" ? payload.now : undefined
      });
      return NextResponse.json({ subscription });
    }

    case "convert_trial": {
      if (typeof payload.subscriptionId !== "string") {
        return NextResponse.json({ error: "subscriptionId is required." }, { status: 400 });
      }
      const subscription = await convertTrial(payload.subscriptionId, {
        now: typeof payload.now === "string" ? payload.now : undefined,
        paymentBehavior: payload.paymentBehavior === "fail" ? "fail" : "success"
      });
      return NextResponse.json({ subscription });
    }

    case "cancel": {
      if (typeof payload.subscriptionId !== "string") {
        return NextResponse.json({ error: "subscriptionId is required." }, { status: 400 });
      }
      const subscription = await cancelSubscription(payload.subscriptionId, {
        now: typeof payload.now === "string" ? payload.now : undefined,
        reason: typeof payload.reason === "string" ? payload.reason : undefined
      });
      return NextResponse.json({ subscription });
    }

    case "retry_billing": {
      const results = await processBillingRetries({
        now: typeof payload.now === "string" ? payload.now : undefined,
        failSubscriptionIds: Array.isArray(payload.failSubscriptionIds)
          ? payload.failSubscriptionIds.filter((entry): entry is string => typeof entry === "string")
          : undefined
      });
      return NextResponse.json({ results });
    }

    default:
      return NextResponse.json({ error: "Unsupported subscription action." }, { status: 400 });
  }
}
