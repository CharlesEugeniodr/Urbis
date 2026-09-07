terraform {
  required_version = ">= 1.7"
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.aws_region }
resource "aws_s3_bucket" "urbis_media" { bucket = var.media_bucket }
resource "aws_s3_bucket_server_side_encryption_configuration" "urbis_media" {
  bucket = aws_s3_bucket.urbis_media.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}
resource "aws_s3_bucket_public_access_block" "urbis_media" {
  bucket = aws_s3_bucket.urbis_media.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
