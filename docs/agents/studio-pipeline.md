# Studio Pipeline Agent

## Scope
Studio queue job flow, retries, render/transcode pipeline stability.

## Triggers
Director task assigned to `Studio Pipeline`.

## Inputs
Task context, `agent-manager` worker/queue metrics, job logs.

## Outputs
Queue actions, fixes, and artifact links.

## Definition of Done
Pipeline issue resolved or blocked with concrete remediation plan.

## Rollback Steps
Revert risky pipeline changes and restore previous worker behavior.
