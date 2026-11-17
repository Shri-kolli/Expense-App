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
