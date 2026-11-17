# Get Started

## Open the deployed app

Use the HTTPS CloudFront URL:

[https://d2t510a2ojscqn.cloudfront.net/](https://d2t510a2ojscqn.cloudfront.net/)

Sign in with the Cognito username `shri`. Find the temporary password in the Cognito
invite email (check spam if needed). At first sign-in, set a permanent password.
MFA is disabled for easier household use.

## Use the tracker

- Add expenses from the dashboard, including by selecting a category or subcategory.
- Review monthly totals, category budgets, daily spending, and transaction history.
- Set a required monthly or yearly limit for every expense subcategory. Yearly limits
  are apportioned monthly, with unused budget carried forward month to month.

## Deploy or update

AWS CLI, Terraform, and credentials for the deployment account are required. The AWS
region is `ap-south-1`.

```bash
aws sts get-caller-identity
bash scripts/deploy.sh
```

Use the existing bucket name and user ID, and review the Terraform plan before
approving changes. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment details.

The S3 bucket is private and its website endpoint is disabled. Always use CloudFront;
do not grant public S3 access or remove the Cognito/API authorization.

## Costs

AWS costs depend on usage and free-tier eligibility; they are not guaranteed to be
zero. Check AWS Billing regularly and consider configuring a budget alert.
