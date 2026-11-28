import { ArnFormat, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Grant, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { WebFunction, WebFunctionAuthType, WebFunctionCode, WebFunctionRuntime } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';
import { addEndpointAlarms } from './memory-service-stack';

export interface AskServiceStackProps extends StackProps {
  readonly artifactPath: string;
  readonly memoryUrl: string;
  readonly memoryEndpointArn: string;
  readonly userServiceUrl: string;
  readonly userServiceEndpointArn: string;
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

    const sessions = new Table(this, 'Sessions', {
      partitionKey: { name: 'sessionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.RETAIN,
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
        USER_SERVICE_URL: props.userServiceUrl,
        CORS_ORIGINS: props.corsOrigins.join(','),
        OPENAI_BASE_URL: props.chatBaseUrl,
        OPENAI_MODEL: props.chatModel,
        OPENAI_API_KEY_PARAMETER_NAME: props.chatKeyParameterName,
        SESSION_TABLE_NAME: sessions.tableName,
      },
    });
    Grant.addToPrincipal({
      grantee: ask,
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
      resourceArns: [sessions.tableArn],
    }).applyBefore(ask.resourceRevision);
    Grant.addToPrincipal({
      grantee: ask,
      actions: ['lambda:InvokeWebFunctionEndpoint'],
      resourceArns: [props.memoryEndpointArn, props.userServiceEndpointArn],
    }).applyBefore(ask.resourceRevision);
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
