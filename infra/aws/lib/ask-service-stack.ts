import { ArnFormat, CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnServerlessCache, CfnUser, CfnUserGroup } from 'aws-cdk-lib/aws-elasticache';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { WebFunction, WebFunctionAuthType, WebFunctionCode, WebFunctionRuntime } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';
import { addEndpointAlarms } from './memory-service-stack';

export interface AskServiceStackProps extends StackProps {
  readonly artifactPath: string;
  readonly memoryUrl: string;
  readonly memoryEndpointArn: string;
  readonly corsOrigins: readonly string[];
  readonly chatBaseUrl: string;
  readonly chatModel: string;
  readonly chatKeyParameterName: string;
  readonly chatKeyKmsKeyArn?: string;
  readonly alarmTopicArn?: string;
}

export class AskServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: AskServiceStackProps) {
    super(scope, id, props);

    const cacheName = 'second-memory-ask-sessions';
    const cacheUserName = 'second-memory-ask';
    const cacheUser = new CfnUser(this, 'SessionUser', {
      engine: 'valkey',
      userId: cacheUserName,
      userName: cacheUserName,
      authenticationMode: { Type: 'iam' },
      accessString:
        'on ~ask:* -@all +@connection +info +get +set +del +exists +eval +evalsha +script|load +cluster|slots +cluster|shards +readonly',
    });
    const userGroup = new CfnUserGroup(this, 'SessionUserGroup', {
      engine: 'valkey',
      userGroupId: cacheName,
      userIds: [cacheUser.ref],
    });
    const cache = new CfnServerlessCache(this, 'SessionCache', {
      serverlessCacheName: cacheName,
      engine: 'valkey',
      majorEngineVersion: '9',
      connectionType: 'public',
      snapshotRetentionLimit: 0,
      userGroupId: userGroup.ref,
    });

    const functionName = 'second-memory-ask-service';
    const endpointName = 'public';
    const ask = new WebFunction(this, 'AskService', {
      webFunctionName: functionName,
      runtime: WebFunctionRuntime.NODEJS_24_X,
      entryPoint: 'dist/main.js',
      code: WebFunctionCode.fromAssetToManagedBucket(props.artifactPath),
      timeout: Duration.seconds(70),
      maxConcurrencyPerEnvironment: 1,
      defaultEndpointAuth: WebFunctionAuthType.APPLICATION_MANAGED,
      defaultEndpoint: { endpointName, maxEnvironments: 5 },
      environment: {
        MEMORY_SERVICE_URL: props.memoryUrl,
        CORS_ORIGINS: props.corsOrigins.join(','),
        OPENAI_BASE_URL: props.chatBaseUrl,
        OPENAI_MODEL: props.chatModel,
        OPENAI_API_KEY_PARAMETER_NAME: props.chatKeyParameterName,
        SESSION_CACHE_HOST: cache.attrEndpointAddress,
        SESSION_CACHE_PORT: cache.attrEndpointPort,
        SESSION_CACHE_NAME: cacheName,
        SESSION_CACHE_USER: cacheUserName,
      },
    });
    ask.addToRolePolicy(
      new PolicyStatement({
        actions: ['elasticache:Connect'],
        resources: [cache.attrArn, cacheUser.attrArn],
      }),
    );
    ask.addToRolePolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeWebFunctionEndpoint'],
        resources: [props.memoryEndpointArn],
      }),
    );
    ask.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          this.formatArn({
            service: 'ssm',
            resource: 'parameter',
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            resourceName: props.chatKeyParameterName.slice(1),
          }),
        ],
      }),
    );
    if (props.chatKeyKmsKeyArn) {
      Key.fromKeyArn(this, 'ChatKey', props.chatKeyKmsKeyArn).grantDecrypt(ask);
    }

    addEndpointAlarms(this, functionName, endpointName, props.alarmTopicArn);
    new CfnOutput(this, 'AskServiceUrl', {
      value: `https://${ask.endpoint.domainName}`,
    });
    new CfnOutput(this, 'AskServiceRevision', { value: ask.revisionId });
  }
}
