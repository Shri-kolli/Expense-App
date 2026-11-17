terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table
resource "aws_dynamodb_table" "expense_tracker" {
  name         = "ExpenseTrackerData"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing - cheapest for low usage
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index for querying by month
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ExpenseTracker"
    Environment = "production"
  }
}

# S3 Bucket for Frontend
resource "aws_s3_bucket" "frontend" {
  bucket = var.bucket_name

  tags = {
    Name        = "ExpenseTrackerFrontend"
    Environment = "production"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "expense-tracker-frontend"
  description                       = "Private S3 origin for the expense tracker"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cognito sign-in is restricted to users created by an administrator.
resource "aws_cognito_user_pool" "expense_tracker" {
  name                = "expense-tracker-users"
  username_attributes = []

  username_configuration {
    case_sensitive = false
  }

  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = true

    invite_message_template {
      email_subject = "Your Expense Tracker sign-in"
      email_message = "Username: {username}<br>Temporary password: {####}<br>Sign in at the Expense Tracker and choose a new password."
      sms_message   = "Username: {username} Temporary password: {####}"
    }
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  mfa_configuration = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 5
      max_length = 2048
    }
  }
}

resource "aws_cognito_user_pool_domain" "expense_tracker" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.expense_tracker.id
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "expense_tracker_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "lambda_dynamodb_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:TransactWriteItems"
        ]
        Resource = [
          aws_dynamodb_table.expense_tracker.arn,
          "${aws_dynamodb_table.expense_tracker.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda Function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend/functions"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "expense_api" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "expense_tracker_api"
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.expense_tracker.name
      USER_ID    = var.user_id
    }
  }
}

# API Gateway (HTTP API - cheaper than REST API)
resource "aws_apigatewayv2_api" "expense_api" {
  name          = "expense-tracker-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization", "x-api-key"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.expense_api.id
  name             = "expense-tracker-cognito"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.frontend.id]
    issuer   = "https://${aws_cognito_user_pool.expense_tracker.endpoint}"
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.expense_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.expense_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy_route" {
  api_id             = aws_apigatewayv2_api.expense_api.id
  route_key          = "ANY /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "options_route" {
  api_id             = aws_apigatewayv2_api.expense_api.id
  route_key          = "OPTIONS /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.expense_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gateway_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.expense_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.expense_api.execution_arn}/*/*"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "expense-tracker-security-headers"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_security_policy {
      content_security_policy = "default-src 'self' https://*.amazoncognito.com; connect-src 'self' https://*.amazoncognito.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'self'; frame-ancestors 'none'"
      override                = true
    }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "Private HTTPS distribution for the expense tracker"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "expense-tracker-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    domain_name = replace(aws_apigatewayv2_api.expense_api.api_endpoint, "https://", "")
    origin_id   = "expense-tracker-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "expense-tracker-s3"
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    compress                   = true
  }

  ordered_cache_behavior {
    path_pattern               = "/api/*"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    target_origin_id           = "expense-tracker-api"
    viewer_protocol_policy     = "https-only"
    cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id   = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    compress                   = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

resource "aws_cognito_user_pool_client" "frontend" {
  name                                 = "expense-tracker-web"
  user_pool_id                         = aws_cognito_user_pool.expense_tracker.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = ["https://${aws_cloudfront_distribution.frontend.domain_name}/"]
  logout_urls                          = ["https://${aws_cloudfront_distribution.frontend.domain_name}/"]
  prevent_user_existence_errors        = "ENABLED"
  access_token_validity                = 60
  id_token_validity                    = 60
  refresh_token_validity               = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

# Outputs
output "website_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.expense_api.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.expense_tracker.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.frontend.id
}

output "cognito_login_domain" {
  value = "https://${aws_cognito_user_pool_domain.expense_tracker.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "dynamodb_table" {
  value = aws_dynamodb_table.expense_tracker.name
}
