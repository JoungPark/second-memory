import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Alarm, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  WebFunction,
  WebFunctionAuthType,
  WebFunctionCode,
  WebFunctionRuntime,
} from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';

export interface MemoryServiceStackProps extends StackProps {
  readonly databaseUrlParameterName: string;
  readonly embeddingApiKeyParameterName: string;
  readonly ssmParameterKmsKeyArn?: string;
  readonly alarmTopicArn?: string;
  readonly artifactPath: string;
  readonly firebaseProjectId: string;
  readonly corsOrigins: readonly string[];
  readonly embeddingBaseUrl: string;
  readonly embeddingModel: string;
}

export class MemoryServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: MemoryServiceStackProps) {
    super(scope, id, props);

    const parameterNames = [
      props.databaseUrlParameterName,
      props.embeddingApiKeyParameterName,
    ];
    for (const name of parameterNames) {
      if (!/^\/(?:[\w.-]+\/)*[\w.-]+$/.test(name)) {
        throw new Error(
          'SSM parameter names must be absolute paths without version selectors',
        );
      }
    }
    if (props.databaseUrlParameterName === props.embeddingApiKeyParameterName) {
      throw new Error(
        'Database and embedding credentials require distinct SSM parameters',
      );
    }
    const functionName = 'second-memory-memory-service';
    const endpointName = 'public';
    const webFunction = new WebFunction(this, 'MemoryService', {
      webFunctionName: functionName,
      runtime: WebFunctionRuntime.NODEJS_24_X,
      entryPoint: 'dist/main.js',
      code: WebFunctionCode.fromAssetToManagedBucket(props.artifactPath),
      timeout: Duration.seconds(30),
      maxConcurrencyPerEnvironment: 1,
      defaultEndpointAuth: WebFunctionAuthType.APPLICATION_MANAGED,
      defaultEndpoint: { endpointName, maxEnvironments: 5 },
      environment: {
        DATABASE_URL_PARAMETER_NAME: props.databaseUrlParameterName,
        EMBEDDING_API_KEY_PARAMETER_NAME: props.embeddingApiKeyParameterName,
        FIREBASE_PROJECT_ID: props.firebaseProjectId,
        CORS_ORIGINS: props.corsOrigins.join(','),
        EMBEDDING_BASE_URL: props.embeddingBaseUrl,
        EMBEDDING_MODEL: props.embeddingModel,
      },
    });

    webFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameters'],
        resources: parameterNames.map((name) =>
          this.formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: name.slice(1),
          }),
        ),
      }),
    );
    if (props.ssmParameterKmsKeyArn) {
      Key.fromKeyArn(
        this,
        'SsmParameterKey',
        props.ssmParameterKmsKeyArn,
      ).grantDecrypt(webFunction);
    }

    addEndpointAlarms(this, functionName, endpointName, props.alarmTopicArn);

    new CfnOutput(this, 'MemoryServiceUrl', {
      value: `https://${webFunction.endpoint.domainName}`,
    });
    new CfnOutput(this, 'MemoryServiceRevision', {
      value: webFunction.revisionId,
    });
  }
}

function addEndpointAlarms(
  stack: Stack,
  functionName: string,
  endpointName: string,
  topicArn?: string,
): void {
  const dimensions = {
    FunctionName: functionName,
    EndpointName: endpointName,
  };
  const alarmDefinitions = [
    [
      'ServerErrors',
      'AWS/Lambda/Web',
      'HTTPResponseStatusClass5XX',
      dimensions,
    ],
    [
      'EnvironmentThrottles',
      'AWS/Lambda/Web/Usage',
      'EndpointActiveEnvironmentThrottles',
      { ...dimensions, ExecutionRegion: stack.region },
    ],
  ] as const;
  const snsAction = topicArn
    ? new SnsAction(Topic.fromTopicArn(stack, 'AlarmTopic', topicArn))
    : undefined;
  for (const [
    alarmId,
    namespace,
    metricName,
    dimensionsMap,
  ] of alarmDefinitions) {
    const alarm = new Alarm(stack, alarmId, {
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
