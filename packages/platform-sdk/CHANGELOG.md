# @lucass-hsa1/platform-sdk

## 0.3.0

### Minor Changes

- f2fb8d0: Initial release of the Digivolution platform SDK (0.1.0).

  Includes:

  - Canonical types: `Tenant`, `PlatformUser`, `Plan`, `AuditLog`, `SystemAlert`, billing types, webhook events
  - Service-to-service HMAC authentication helpers (`signServiceRequest`, `verifyServiceRequest`)
  - Platform JWT helpers (`signPlatformJwt`, `verifyPlatformJwt`)
  - HTTP client (`PlatformClient`) for calling `/api/v1/*` from app servers
  - Webhook validation (`parseWebhook`) and typed dispatcher (`createWebhookDispatcher`)
  - Express middleware (`requireTenantAdmin`) for protecting app routes with platform-issued JWT

  This is the foundation for the C-architecture rewrite documented in
  `/root/digivols-platform-rewrite/`. Apps will adopt this SDK starting in Phase 3.
