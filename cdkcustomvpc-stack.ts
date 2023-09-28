import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IpAddresses } from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkcustomvpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkcustomvpcQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    
    // Create VPC
    const vpc = new ec2.Vpc(this, 'TheVPC', {
      ipAddresses: IpAddresses.cidr('10.20.0.0/16')
    });
    
    //Create Auto scaling group
    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
    });
    

    //Create Application load balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    });

    const listener = alb.addListener('WebListener', {
      port: 80,
    });
    
    listener.addTargets('Target', {
      port: 80,
      targets: [asg]
    });
    
    listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
    
    
    
    // Create a security group for RDS instance
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
      vpc: vpc,
      description: 'RDS Security Group',
    });

    // Allow inbound traffic to the RDS instance
    rdsSecurityGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(3306));

    // Create RDS instance with Multi-AZ
    const rdsInstance = new rds.DatabaseInstance(this, 'MyRDSInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      vpc: vpc,
      securityGroups: [rdsSecurityGroup],
      multiAz: true,
    });



    
  }
}
