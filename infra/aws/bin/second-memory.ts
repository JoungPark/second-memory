import { App } from 'aws-cdk-lib';
import { resolve } from 'node:path';
import { MemoryServiceStack } from '../lib/memory-service-stack';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. See infra/aws/.env.example.`);
  }
  return value;
}

const account = required('AWS_ACCOUNT');
const region = required('AWS_REGION');
const corsOrigins = required('CORS_ORIGINS')
  .split(',')
  .map((origin) => origin.trim());
for (const origin of corsOrigins) {
  if (
    !URL.canParse(origin) ||
    new URL(origin).protocol !== 'https:' ||
    new URL(origin).origin !== origin
  ) {
    throw new Error('CORS_ORIGINS must contain exact HTTPS origins');
  }
}

const app = new App();
new MemoryServiceStack(app, 'SecondMemoryMemoryService', {
  env: { account, region },
  databaseUrlParameterName: required('DATABASE_URL_PARAMETER_NAME'),
  embeddingApiKeyParameterName: required('EMBEDDING_API_KEY_PARAMETER_NAME'),
  ssmParameterKmsKeyArn: process.env.SSM_PARAMETER_KMS_KEY_ARN?.trim(),
  alarmTopicArn: process.env.ALARM_TOPIC_ARN?.trim(),
  artifactPath: resolve(
    process.env.MEMORY_ARTIFACT_PATH ?? 'dist/assets/memory-service.zip',
  ),
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  corsOrigins,
  embeddingBaseUrl: required('EMBEDDING_BASE_URL'),
  embeddingModel: required('EMBEDDING_MODEL'),
});
