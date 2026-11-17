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
│  │   S3 BUCKET      │ NEW! ✅          │
│  │  (Your Website)  │                  │
│  └──────────────────┘                  │
│                                         │
│  ┌──────────────────┐                  │
│  │  DynamoDB Table  │ NEW! ✅          │
│  │  (Your Data)     │                  │
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

Total Cost: ~$0.50-$2/month
```

---

## ❓ FAQs

**Q: Does it create a new S3 bucket?**  
A: YES! You choose a unique name, it creates it for you.

**Q: Do I need an existing bucket?**  
A: NO! Everything is created from scratch.

**Q: What if the bucket name is taken?**  
A: Choose another unique name (add your name/numbers).

**Q: Can I delete everything later?**  
A: YES! Run `terraform destroy` to remove all resources.

**Q: How much does it cost?**  
A: ~$0.50-$2/month (mostly S3 storage, rest is free tier).

---

## 🎯 During Deployment Script

You'll be asked:

1. **Bucket name**: Choose something like `yourname-expenses-2026`
2. **User ID**: Just press Enter (uses `user001`)
3. **Region**: Just press Enter (uses `ap-south-1`)
4. **Confirm**: Type `yes`

Then wait 3-5 minutes while AWS creates everything!

---

## ✅ After Deployment

You'll get:
```
Website URL: http://your-bucket.s3-website.ap-south-1.amazonaws.com
API Endpoint: https://abc123.execute-api.ap-south-1.amazonaws.com
```

**Open the Website URL** → Click "Yes" to initialize → Start tracking!

---

## 🆘 Problems?

**Script fails?** See [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) for detailed manual steps.

**Need help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting.

---

**Ready? Let's go!**

```bash
cd /Users/kzgh317/Documents/bot/Expense-App
./scripts/deploy.sh
```

🎉 You'll have your expense tracker running in 15 minutes!
