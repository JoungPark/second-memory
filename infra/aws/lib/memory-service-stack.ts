import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Alarm, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { WebFunction, WebFunctionAuthType, WebFunctionCode, WebFunctionRuntime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';

export interface MemoryServiceStackProps extends StackProps {
  readonly databaseUrlParameterName: string;
  readonly embeddingApiKeyParameterName: string;
  readonly ssmParameterKmsKeyArn?: string;
  readonly alarmTopicArn?: string;
  readonly artifactPath: string;
  readonly internalArtifactPath: string;
  readonly firebaseProjectId: string;
  readonly corsOrigins: readonly string[];
  readonly embeddingBaseUrl: string;
  readonly embeddingModel: string;
}

export class MemoryServiceStack extends Stack {
  readonly internalUrl: string;
  readonly internalEndpointArn: string;

  constructor(scope: Construct, id: string, props: MemoryServiceStackProps) {
    super(scope, id, props);

    const parameterNames = [props.databaseUrlParameterName, props.embeddingApiKeyParameterName];
    const parameterArns = parameterNames.map((name) =>
      this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: name.slice(1),
      }),
    );

    const publicMemory = this.createMemoryWebFunction('MemoryService', props, parameterArns, {
      functionName: 'second-memory-memory-service',
      endpointName: 'public',
      authType: WebFunctionAuthType.APPLICATION_MANAGED,
      artifactPath: props.artifactPath,
      environment: { CORS_ORIGINS: props.corsOrigins.join(',') },
    });

    new CfnOutput(this, 'MemoryServiceUrl', {
      value: `https://${publicMemory.endpoint.domainName}`,
    });
    new CfnOutput(this, 'MemoryServiceRevision', {
      value: publicMemory.revisionId,
    });

    const internal = this.createMemoryWebFunction('InternalMemoryService', props, parameterArns, {
      functionName: 'second-memory-internal-memory-service',
      endpointName: 'internal',
      authType: WebFunctionAuthType.IAM_AUTH,
      artifactPath: props.internalArtifactPath,
      environment: { MEMORY_SERVICE_PROFILE: 'internal' },
      idPrefix: 'Internal',
    });
    this.internalUrl = `https://${internal.endpoint.domainName}`;
    this.internalEndpointArn = internal.endpoint.endpointArn;
    new CfnOutput(this, 'InternalMemoryServiceUrl', {
      value: this.internalUrl,
    });
    new CfnOutput(this, 'InternalMemoryServiceEndpointArn', {
      value: this.internalEndpointArn,
    });
    new CfnOutput(this, 'InternalMemoryServiceRevision', {
      value: internal.revisionId,
    });
  }

  private createMemoryWebFunction(
    constructId: string,
    props: MemoryServiceStackProps,
    parameterArns: string[],
    {
      functionName,
      endpointName,
      authType,
      artifactPath,
      environment,
      idPrefix = '',
    }: {
      functionName: string;
      endpointName: string;
      authType: WebFunctionAuthType;
      artifactPath: string;
      environment: Record<string, string>;
      idPrefix?: string;
    },
  ): WebFunction {
    const webFunction = new WebFunction(this, constructId, {
      webFunctionName: functionName,
      runtime: WebFunctionRuntime.NODEJS_24_X,
      entryPoint: 'dist/main.js',
      code: WebFunctionCode.fromAssetToManagedBucket(artifactPath),
      timeout: Duration.seconds(30),
      maxConcurrencyPerEnvironment: 1,
      defaultEndpointAuth: authType,
      defaultEndpoint: { endpointName, maxEnvironments: 5 },
      environment: {
        DATABASE_URL_PARAMETER_NAME: props.databaseUrlParameterName,
        EMBEDDING_API_KEY_PARAMETER_NAME: props.embeddingApiKeyParameterName,
        FIREBASE_PROJECT_ID: props.firebaseProjectId,
        EMBEDDING_BASE_URL: props.embeddingBaseUrl,
        EMBEDDING_MODEL: props.embeddingModel,
        ...environment,
      },
    });
    webFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameters'],
        resources: parameterArns,
      }),
    );
    if (props.ssmParameterKmsKeyArn) {
      Key.fromKeyArn(this, `${idPrefix}SsmParameterKey`, props.ssmParameterKmsKeyArn).grantDecrypt(webFunction);
    }
    addEndpointAlarms(this, functionName, endpointName, props.alarmTopicArn, idPrefix);
    return webFunction;
  }
}

export function addEndpointAlarms(
  stack: Stack,
  functionName: string,
  endpointName: string,
  topicArn?: string,
  idPrefix = '',
): void {
  const dimensions = {
    FunctionName: functionName,
    EndpointName: endpointName,
  };
  const alarmDefinitions = [
    ['ServerErrors', 'AWS/Lambda/Web', 'HTTPResponseStatusClass5XX', dimensions],
    [
      'EnvironmentThrottles',
      'AWS/Lambda/Web/Usage',
      'EndpointActiveEnvironmentThrottles',
      { ...dimensions, ExecutionRegion: stack.region },
    ],
  ] as const;
  const snsAction = topicArn ? new SnsAction(Topic.fromTopicArn(stack, `${idPrefix}AlarmTopic`, topicArn)) : undefined;
  for (const [alarmId, namespace, metricName, dimensionsMap] of alarmDefinitions) {
    const alarm = new Alarm(stack, `${idPrefix}${alarmId}`, {
      metric: new Metric({
        namespace,
        metricName,
        dimensionsMap,
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      evaluationPeriods: 1,
      threshold: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    if (snsAction) {
      alarm.addAlarmAction(snsAction);
    }
  }
}
