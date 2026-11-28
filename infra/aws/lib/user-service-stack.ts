import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { WebFunction, WebFunctionAuthType, WebFunctionCode, WebFunctionRuntime } from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';
import { addEndpointAlarms } from './memory-service-stack';

interface UserServiceStackProps extends StackProps {
  readonly artifactPath: string;
  readonly databaseUrlParameterName: string;
  readonly firebaseProjectId: string;
  readonly ssmParameterKmsKeyArn?: string;
  readonly alarmTopicArn?: string;
}

export class UserServiceStack extends Stack {
  readonly internalUrl: string;
  readonly internalEndpointArn: string;

  constructor(scope: Construct, id: string, props: UserServiceStackProps) {
    super(scope, id, props);
    const identities = new Table(this, 'Identities', {
      partitionKey: { name: 'firebaseUid', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    const functionName = 'second-memory-user-service';
    const endpointName = 'internal';
    const service = new WebFunction(this, 'UserService', {
      webFunctionName: functionName,
      runtime: WebFunctionRuntime.NODEJS_24_X,
      entryPoint: 'dist/main.js',
      code: WebFunctionCode.fromAssetToManagedBucket(props.artifactPath),
      timeout: Duration.seconds(30),
      maxConcurrencyPerEnvironment: 1,
      defaultEndpointAuth: WebFunctionAuthType.IAM_AUTH,
      defaultEndpoint: { endpointName, maxEnvironments: 5 },
      environment: {
        DATABASE_URL_PARAMETER_NAME: props.databaseUrlParameterName,
        FIREBASE_PROJECT_ID: props.firebaseProjectId,
      },
    });
    service.addToRolePolicy(
      new PolicyStatement({
        actions: ['ssm:GetParameters'],
        resources: [
          this.formatArn({
            service: 'ssm',
            resource: 'parameter',
            resourceName: props.databaseUrlParameterName.slice(1),
          }),
        ],
      }),
    );
    if (props.ssmParameterKmsKeyArn) {
      Key.fromKeyArn(this, 'DatabaseKey', props.ssmParameterKmsKeyArn).grantDecrypt(service);
    }
    addEndpointAlarms(this, functionName, endpointName, props.alarmTopicArn);
    this.internalUrl = `https://${service.endpoint.domainName}`;
    this.internalEndpointArn = service.endpoint.endpointArn;
    new CfnOutput(this, 'UserServiceUrl', { value: this.internalUrl });
    new CfnOutput(this, 'UserServiceEndpointArn', { value: this.internalEndpointArn });
    new CfnOutput(this, 'UserServiceRevision', { value: service.revisionId });
    new CfnOutput(this, 'IdentityTableName', { value: identities.tableName });
  }
}
