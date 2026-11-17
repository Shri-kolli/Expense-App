# Deployment Guide

This guide will help you deploy your Personal Expense Tracker to AWS.

## Prerequisites

1. **AWS Account** - Create one at https://aws.amazon.com if you don't have one
2. **AWS CLI** installed and configured
3. **Terraform** installed (or use CloudFormation alternative)
4. **Python 3.11** installed locally

## Cost Estimate

- **Expected monthly cost**: Depends on CloudFront traffic and AWS free-tier eligibility.
- A two-person household should have low usage, but AWS charges are not guaranteed to be $0.

## Step-by-Step Deployment

### Deploy or update

Use the maintained deployment script from the project root:

```bash
aws configure
bash scripts/deploy.sh
```

Use the same bucket name, user ID, and `ap-south-1` region as the existing deployment.
Review the Terraform plan before approving changes. The script keeps the same-origin
API and Cognito configuration in the frontend; do not replace them with a direct,
unauthenticated API endpoint.

## Post-Deployment

### Access Your Application

Visit the HTTPS CloudFront URL printed by Terraform:
```
https://dxxxxxxxxxxxxx.cloudfront.net
```
Sign in with an administrator-invited Cognito account. First sign-in requires changing the
temporary password and enrolling an authenticator app.

### Initialize Default Data

After signing in, initialize categories if prompted. The API rejects unauthenticated requests.

### Test the Application

1. ✅ Add a test expense
2. ✅ Add a test income
3. ✅ Check dashboard shows correct totals
4. ✅ Try editing/deleting transactions
5. ✅ Create a custom category

## Making Updates

For code updates, use the same deployment script or carefully upload only the changed
files to the private bucket. Never disable S3 public-access blocking or grant public
read access. CloudFront serves the private origin.

## Troubleshooting

### Sign-in or API errors
- Confirm that you are using the CloudFront HTTPS URL.
- Sign in again if the session has expired.
- Check that the frontend Cognito configuration matches the deployed user pool and client.

### 401 Unauthorized
- The API requires a valid Cognito session. Sign in again.

### 403 Forbidden on the S3 website endpoint
- This is expected: the S3 bucket is private and its website endpoint is disabled.
- Open the CloudFront HTTPS URL instead.

### Lambda timeout
- Increase timeout in Lambda configuration (current: 30s)
- Check CloudWatch logs for errors

### DynamoDB access denied
- Ensure Lambda execution role has DynamoDB permissions
- Verify table name matches in environment variables

## Cost Optimization

### Current Setup (Already Optimized)
- ✅ DynamoDB: On-demand pricing (pay per request)
- ✅ Lambda: Free tier covers 1M requests/month
- ✅ API Gateway: HTTP API (cheaper than REST)
- ✅ S3: Minimal storage costs

### Additional Savings
- CloudFront charges depend on requests, data transfer, and free-tier eligibility.
- Keep Lambda memory at default 128MB
- Use `ap-south-1` region

## Security Notes

The deployed app uses HTTPS CloudFront, a private S3 origin, invite-only Cognito accounts,
and API Gateway JWT authorization. MFA is disabled for easier household use. Keep the
temporary password private and change it during first sign-in. AWS account administrators
can still access resources and data.

The default `cloudfront.net` hostname uses CloudFront's default certificate, which does
not let this configuration set a custom minimum TLS version. Enforcing a chosen TLS
minimum requires an alternate domain and ACM certificate; the current setup does not
include those additional domain requirements.

## Cleanup / Destroy

To delete everything and stop charges:

```bash
cd infrastructure/terraform

# Delete all resources
terraform destroy
# Type 'yes' when prompted

# Manual cleanup:
# - Empty and delete S3 bucket
# - Delete DynamoDB table
```

## Support

For issues:
1. Check CloudWatch Logs for Lambda errors
2. Review API Gateway logs
3. Check browser console for frontend errors

## Next Steps

- Set up monthly budget alerts in AWS
- Add more categories specific to your needs
- Customize the frontend colors/theme
- Export data periodically as backup
