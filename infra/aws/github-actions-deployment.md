# Deploy to AWS with GitHub Actions

Every push to `main` queues an AWS deployment of that commit, including web-only and documentation changes. GitHub Actions builds three Arm64 ZIPs, diffs all stacks, and deploys them. Vercel handles the web app and mobile releases stay manual. Apply any required database migrations before merging the backend change. [Deployment workflow](../../.github/workflows/deploy-aws.yml)

## One-time AWS setup

1. Use the existing bootstrapped account in `ap-southeast-2`. In IAM, create or reuse the OpenID Connect provider `https://token.actions.githubusercontent.com` with audience `sts.amazonaws.com`.
2. Create an IAM role for GitHub Actions. Give its federated trust policy the provider ARN, action `sts:AssumeRoleWithWebIdentity`, and two `StringEquals` conditions. Set `token.actions.githubusercontent.com:aud` to `sts.amazonaws.com`. Set `token.actions.githubusercontent.com:sub` to the repository's exact branch subject. With immutable IDs it is `repo:JoungPark@OWNER_ID/second-memory@REPO_ID:ref:refs/heads/main`. The legacy format is `repo:JoungPark/second-memory:ref:refs/heads/main`. The repository API returns the IDs in `owner.id` and `id`.
3. Give the role permission to call `sts:AssumeRole` on the three CDK bootstrap roles below, substituting the target account ID. CDK uses the file-publishing role for ZIP assets, the lookup role for diff, and the deploy role for CloudFormation.

   ```text
   arn:aws:iam::<account-id>:role/cdk-hnb659fds-file-publishing-role-<account-id>-ap-southeast-2
   arn:aws:iam::<account-id>:role/cdk-hnb659fds-lookup-role-<account-id>-ap-southeast-2
   arn:aws:iam::<account-id>:role/cdk-hnb659fds-deploy-role-<account-id>-ap-southeast-2
   ```

See GitHub's guide for the provider setup, IAM trust conditions, and supported subject formats. [Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

## GitHub repository settings

Under **Settings → Secrets and variables → Actions**, add the following repository variables from the active deployment configuration. [CDK settings](.env.example)

| Purpose    | Variable names                                                                  |
| ---------- | ------------------------------------------------------------------------------- |
| AWS target | `AWS_DEPLOY_ROLE_ARN`, `AWS_ACCOUNT`, `AWS_REGION`                              |
| Shared     | `CORS_ORIGINS`, `FIREBASE_PROJECT_ID`, `DATABASE_URL_PARAMETER_NAME`            |
| Memory     | `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY_PARAMETER_NAME`     |
| Ask        | `ASK_OPENAI_BASE_URL`, `ASK_OPENAI_MODEL`, `ASK_OPENAI_API_KEY_PARAMETER_NAME`  |
| Optional   | `ALARM_TOPIC_ARN`, `SSM_PARAMETER_KMS_KEY_ARN`, `ASK_SSM_PARAMETER_KMS_KEY_ARN` |

Add the contents of the production database CA PEM file as the multiline repository secret `DATABASE_CA_PEM`. The workflow restores it before building Memory. The database URL and provider API keys stay in the SSM SecureStrings identified by the three parameter names.

## Monitor deployments

In **Actions → Deploy AWS backends**, open the run for the pushed commit. To retry a transient failure, use **Re-run failed jobs** on the current `main` commit. Rerunning an older run would deploy its original commit.
