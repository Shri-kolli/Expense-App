# Deployment and Update Steps

The deployed expense tracker uses CloudFront HTTPS, a private S3 origin, invite-only
Cognito sign-in, and an API Gateway JWT authorizer. MFA is disabled.
Do not make the S3 bucket public or use the S3 website endpoint.

## Open the deployed app

Visit [https://d2t510a2ojscqn.cloudfront.net/](https://d2t510a2ojscqn.cloudfront.net/).
Sign in as `shri`. On first sign-in, Cognito requires you to set a permanent password.
Check your email, including spam, for the temporary password.

## Deploy infrastructure

Prerequisites: AWS CLI credentials for the correct AWS account and Terraform.

```bash
aws sts get-caller-identity
bash scripts/deploy.sh
```

Use the existing unique S3 bucket name, user ID, and `ap-south-1` region. Review the
Terraform plan carefully before approving it. The script uploads the frontend to the
private bucket and does not replace the Cognito or same-origin API configuration.

## Update code

After making code changes, inspect the Terraform plan and use the deployment script
when infrastructure or frontend assets need updating. It uploads frontend assets to
the configured private S3 bucket. Keep the existing CloudFront, Cognito, and API
authorization configuration intact.

## Security checks

- The CloudFront URL should return the app over HTTPS.
- Direct access to the S3 bucket should be denied.
- Unauthenticated requests to `/api/*` should return `401`.
- Only administrator-created Cognito users can sign in; MFA is disabled.

## Cost

Charges depend on AWS account eligibility, region, requests, and data transfer. The
application is intended for low household usage, but costs are not guaranteed to be
zero. Review the AWS Billing console and configure a budget alert.

## Remove the deployment

To delete AWS resources, review the impact and current Terraform workspace before
running `terraform destroy`. Destroying the DynamoDB table permanently deletes
expense data; export or back up data first.
