# 🚀 DEPLOY NOW - Quick Start

## ⚡ 5-Minute Setup (First Time)

### 1. Install Tools
macOS:
```bash
brew install awscli terraform
```

Windows (PowerShell):
```powershell
winget install -e --id Amazon.AWSCLI
winget install -e --id Hashicorp.Terraform
```

On Windows, run the deployment script from WSL Bash so it can use the installed Windows executables.

### 2. Configure AWS
```bash
aws configure
# Enter your AWS credentials
# Region: ap-south-1
```

### 3. Deploy
```bash
cd /path/to/Expense-App
bash scripts/deploy.sh
```

### 4. Use Your App!
Open the website URL shown at the end.

---

## 📦 What Gets Created

```
┌─────────────────────────────────────────┐
│ YOUR AWS ACCOUNT                        │
│                                         │
│  ┌──────────────────┐                  │
│  │  DynamoDB Table  │ NEW! ✅          │
│  │  (Your Data)     │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │ Private S3 + CDN │ HTTPS ✅         │
│  │ (Website only)   │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │ Cognito Login    │ MFA off          │
│  │ (Invite only)    │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │ Lambda Function  │ NEW! ✅          │
│  │  (Your API)      │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │  API Gateway     │ NEW! ✅          │
│  │  (Routes)        │                  │
│  └──────────────────┘                  │
│                                         │
└─────────────────────────────────────────┘

Cost depends on traffic and AWS free-tier eligibility. For two users, usage should be small,
but CloudFront and other services are not guaranteed to be free. Check AWS billing.
```

---

## ❓ FAQs

**Q: Is the S3 website public?**  
A: No. S3 access is private; the site is served through HTTPS CloudFront.

**Q: Do I need an existing bucket?**  
A: NO! Everything is created from scratch.

**Q: What if the bucket name is taken?**  
A: Choose another unique name (add your name/numbers).

**Q: Can I delete everything later?**  
A: YES! Run `terraform destroy` to remove all resources.

**Q: How much does it cost?**  
A: It depends on account eligibility and usage. Charges are not guaranteed to be zero; check AWS Billing.

---

## 🎯 During Deployment Script

You'll be asked:

1. **Bucket name**: Enter the unique bucket name configured for this deployment
2. **User ID**: Keep the configured user ID for existing data
3. **Region**: Use `ap-south-1`
4. **Confirm**: Type `yes`

Then wait 3-5 minutes while AWS creates everything!

---

## ✅ After Deployment

You'll get:
```
Website URL: https://dxxxxxxxxxxxxx.cloudfront.net
```

**Open the HTTPS Website URL** → Sign in with your invited Cognito user.
The first sign-in requires setting a permanent password. MFA is disabled.
The API requires a valid Cognito login.

---

## 🆘 Problems?

**Script fails?** See [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) for detailed manual steps.

**Need help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting.

---

**Ready? Review the Terraform plan before approving it.**

```bash
cd /path/to/Expense-App
bash scripts/deploy.sh
```
