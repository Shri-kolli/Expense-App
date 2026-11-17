variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "bucket_name" {
  description = "S3 bucket name for frontend (must be globally unique)"
  type        = string
  default     = "expense-tracker-frontend-personal" # Change this to something unique
}

variable "user_id" {
  description = "User ID for expense tracking"
  type        = string
  default     = "user001" # Your personal user ID
}

variable "cognito_domain_prefix" {
  description = "Globally unique Cognito hosted login domain prefix"
  type        = string
  default     = "shri-expense-tracker-841611145026"
}
