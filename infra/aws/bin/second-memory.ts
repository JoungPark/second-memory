import { App } from 'aws-cdk-lib';
import { resolve } from 'node:path';
import { MemoryServiceStack } from '../lib/memory-service-stack';
import { AskServiceStack } from '../lib/ask-service-stack';
import { UserServiceStack } from '../lib/user-service-stack';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. See infra/aws/.env.example.`);
  }
  return value;
}

function requiredProviderUrl(name: string): string {
  const url = URL.parse(required(name));
  if (url?.protocol !== 'https:' || url.username || url.password || /[?#]/.test(url.href)) {
    throw new Error(`${name} must be an HTTPS provider URL without credentials, a query, or a fragment`);
  }
  return url.href.replace(/\/$/, '');
}

function requiredSsmParameterName(name: string): string {
  const value = required(name);
  if (!/^\/(?:[\w.-]+\/)*[\w.-]+$/.test(value)) {
    throw new Error(`${name} must be an absolute SSM parameter path without a version selector`);
  }
  return value;
}

const env = { account: required('AWS_ACCOUNT'), region: required('AWS_REGION') };
const alarmTopicArn = process.env.ALARM_TOPIC_ARN?.trim();
const corsOrigins = required('CORS_ORIGINS')
  .split(',')
  .map((origin) => origin.trim());
for (const origin of corsOrigins) {
  if (!URL.canParse(origin) || new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin) {
    throw new Error('CORS_ORIGINS must contain exact HTTPS origins');
  }
}

const databaseUrlParameterName = requiredSsmParameterName('DATABASE_URL_PARAMETER_NAME');
const embeddingBaseUrl = requiredProviderUrl('EMBEDDING_BASE_URL');
const embeddingModel = required('EMBEDDING_MODEL');
const embeddingApiKeyParameterName = requiredSsmParameterName('EMBEDDING_API_KEY_PARAMETER_NAME');
const chatBaseUrl = requiredProviderUrl('ASK_OPENAI_BASE_URL');
const chatModel = required('ASK_OPENAI_MODEL');
const chatKeyParameterName = requiredSsmParameterName('ASK_OPENAI_API_KEY_PARAMETER_NAME');
if (new Set([databaseUrlParameterName, embeddingApiKeyParameterName, chatKeyParameterName]).size !== 3) {
  throw new Error('Database, embedding, and chat credentials require distinct SSM parameters');
}

const app = new App();

const user = new UserServiceStack(app, 'SecondMemoryUserService', {
  env,
  artifactPath: resolve(process.env.USER_ARTIFACT_PATH?.trim() || 'dist/assets/user-service.zip'),
  databaseUrlParameterName,
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  ssmParameterKmsKeyArn: process.env.SSM_PARAMETER_KMS_KEY_ARN?.trim(),
  alarmTopicArn,
});

const defaultMemoryArtifactPath = 'dist/assets/memory-service.zip';
const memory = new MemoryServiceStack(app, 'SecondMemoryMemoryService', {
  env,
  databaseUrlParameterName,
  embeddingApiKeyParameterName,
  ssmParameterKmsKeyArn: process.env.SSM_PARAMETER_KMS_KEY_ARN?.trim(),
  alarmTopicArn,
  artifactPath: resolve(process.env.MEMORY_ARTIFACT_PATH?.trim() || defaultMemoryArtifactPath),
  internalArtifactPath: resolve(process.env.INTERNAL_MEMORY_ARTIFACT_PATH?.trim() || defaultMemoryArtifactPath),
  firebaseProjectId: required('FIREBASE_PROJECT_ID'),
  corsOrigins,
  embeddingBaseUrl,
  embeddingModel,
});

// The managed ZIP publisher resolves environment variables before CDK links cross-stack resource attributes.
const ask = new AskServiceStack(app, 'SecondMemoryAskService', {
  env,
  artifactPath: resolve(process.env.ASK_ARTIFACT_PATH ?? 'dist/assets/ask-service.zip'),
  corsOrigins,
  memoryUrl: memory.exportValue(memory.internalUrl, {
    name: `${memory.stackName}:InternalMemoryServiceUrl`,
  }),
  memoryEndpointArn: memory.exportValue(memory.internalEndpointArn, {
    name: `${memory.stackName}:InternalMemoryServiceEndpointArn`,
  }),
  userServiceUrl: user.exportValue(user.internalUrl, {
    name: `${user.stackName}:UserServiceUrl`,
  }),
  userServiceEndpointArn: user.exportValue(user.internalEndpointArn, {
    name: `${user.stackName}:UserServiceEndpointArn`,
  }),
  chatBaseUrl,
  chatModel,
  chatKeyParameterName,
  chatKeyKmsKeyArn: process.env.ASK_SSM_PARAMETER_KMS_KEY_ARN?.trim(),
  alarmTopicArn,
});
ask.addStackDependency(memory);
ask.addStackDependency(user);
