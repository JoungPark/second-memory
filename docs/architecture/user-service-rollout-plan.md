# User Service rollout plan

This rollout establishes the identity service and storage needed for the account access and usage controls in the [User Service proposal](user-service-proposal.md).

Roll out User Service in four stages. Push each stage directly to `main` and verify it before pushing the next. The existing GitHub Actions workflow handles all AWS deployments. Preserve each account's Firebase UID, user ID, and tenant ID so users can keep access to their memories and Ask sessions.

## 1. Deploy User Service against PostgreSQL

Add an IAM-protected `POST /internal/v1/auth/resolve` endpoint. User Service verifies the Firebase ID token and resolves or creates the identity in the existing PostgreSQL tables. Add the User Service ZIP and CDK stack to the commands the workflow already runs. Provision the dedicated DynamoDB table for step 4.

Verify that User Service returns the same user and tenant IDs as the current resolver for an existing Firebase account.

## 2. Switch Ask to User Service

Point Ask's identity client at User Service and grant its AWS role permission to invoke the endpoint. Ask sends the resolved user and tenant IDs to internal Memory for scoped search and summary writes.

Verify that a known account can recall an existing memory and resume an existing Ask session.

## 3. Switch Memory to User Service

Point public Memory at User Service and remove the old identity endpoint from internal Memory. Move the Prisma schema, generated client configuration, and applied migration history into Memory Service. Preserve the applied migration files exactly. Give User Service a temporary adapter for the PostgreSQL identity tables, then remove `@second-memory/server-db`.

Verify capture, listing, and recall with an existing account. Confirm that a second account cannot access its memories.

## 4. Migrate identities to DynamoDB

Run a backfill script with dry-run, apply, and verify modes. Copy Firebase UIDs, user and tenant IDs, and metadata. Use conditional writes so a retry accepts identical records and stops on conflicting mappings. Report counts without logging personal data.

Pause new account creation and drain in-flight identity writes for the final copy. Rerun the backfill and verify the mappings and Memory ownership references. Apply the Memory migration that drops the foreign keys to the legacy identity tables and preserves the owner UUID columns and indexes. Push the User Service switch to DynamoDB through `main`.

Verify that existing accounts can access their memories and sessions and that concurrent first sign-ins create a single identity. Keep the legacy identity tables read-only through the rollback window. If rollback is needed after new accounts have been created, pause identity creation and copy those mappings back with their exact IDs before restoring PostgreSQL as the identity store.
