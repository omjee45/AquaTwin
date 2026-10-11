# -*- coding: utf-8 -*-
"""
deploy/setup_aws.py
───────────────────
Automated setup script for AWS services used in AquaTwin:
1. Verifies AWS credentials via STS (never exposes secrets or keys)
2. Creates S3 bucket `aquatwin-data-<account_id>` (or uses specified bucket)
3. Configures S3 CORS rules so the frontend can load GeoJSON directly
4. Uploads static hydrology datasets (flood_extent.geojson, roads_scored.json, etc.)
5. Configures Amazon SNS topic `AquaTwin-Emergency-Alerts` and email subscription
"""

import os
import sys
import json
import mimetypes
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env", override=False)
except ImportError:
    pass

import boto3
from botocore.exceptions import ClientError

OUT_DIR = ROOT_DIR / "prep" / "out"


def setup():
    region = os.environ.get("AWS_REGION", "us-east-1")
    print("=" * 75)
    print("  AquaTwin AWS Services Setup (S3 + SNS)")
    print("=" * 75)

    # 1. Verify STS identity
    try:
        sts = boto3.client("sts", region_name=region)
        identity = sts.get_caller_identity()
        account_id = identity["Account"]
        user_arn = identity["Arn"]
        print(f"v AWS Connected   : Region={region} | Account={account_id}")
        print(f"  Caller ARN      : {user_arn}")
    except Exception as e:
        print(f"X AWS Auth Failed : {type(e).__name__}: {e}")
        print("  Please check your AWS credentials or profile.")
        sys.exit(1)

    # 2. S3 Bucket Setup
    s3 = boto3.client("s3", region_name=region)
    bucket_name = os.environ.get("S3_BUCKET_NAME", f"aquatwin-data-{account_id}")

    print(f"\n[1] Amazon S3 Bucket: {bucket_name}")
    try:
        # Check if bucket exists
        s3.head_bucket(Bucket=bucket_name)
        print(f"  v Bucket already exists: s3://{bucket_name}")
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code in ["404", "NoSuchBucket"]:
            try:
                print(f"  Creating S3 bucket: s3://{bucket_name} in {region}...")
                if region == "us-east-1":
                    s3.create_bucket(Bucket=bucket_name)
                else:
                    s3.create_bucket(
                        Bucket=bucket_name,
                        CreateBucketConfiguration={"LocationConstraint": region}
                    )
                print(f"  v Bucket created successfully: s3://{bucket_name}")
            except Exception as ce:
                print(f"  X Failed to create bucket: {ce}")
                sys.exit(1)
        else:
            print(f"  X Cannot access bucket '{bucket_name}': {e}")
            sys.exit(1)

    # 3. Configure CORS on S3 for Frontend Web Apps
    print(f"\n[2] Configuring S3 CORS for MapLibre / Web Dashboard...")
    cors_config = {
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3000
            }
        ]
    }
    try:
        s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_config)
        print("  v S3 CORS configuration applied (Allow GET/HEAD from any origin).")
    except Exception as e:
        print(f"  ! Warning: Unable to set CORS: {e}")

    # 4. Upload static datasets from prep/out
    files_to_upload = [
        "flood_extent.geojson",
        "roads_scored.json",
        "places.json",
        "demo_segments.json",
        "routing_params.json",
        "stats.json",
        "preview.png"
    ]

    print(f"\n[3] Uploading Hydrology Datasets to s3://{bucket_name}...")
    uploaded_urls = {}
    for filename in files_to_upload:
        filepath = OUT_DIR / filename
        if not filepath.exists():
            print(f"  ! Skipping missing file: {filename}")
            continue

        content_type, _ = mimetypes.guess_type(str(filepath))
        if not content_type:
            content_type = "application/json" if filename.endswith(".json") or filename.endswith(".geojson") else "application/octet-stream"

        file_size = filepath.stat().st_size
        print(f"  > Uploading {filename} ({file_size / 1024:.1f} KB)...", end=" ", flush=True)
        try:
            s3.upload_file(
                Filename=str(filepath),
                Bucket=bucket_name,
                Key=filename,
                ExtraArgs={"ContentType": content_type}
            )
            s3_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{filename}"
            uploaded_urls[filename] = s3_url
            print("DONE")
        except Exception as e:
            print(f"FAILED ({e})")

    # 5. SNS Topic & Subscription
    print(f"\n[4] Amazon SNS Setup: AquaTwin-Emergency-Alerts...")
    sns = boto3.client("sns", region_name=region)
    topic_arn = None
    try:
        topics = sns.list_topics().get("Topics", [])
        for t in topics:
            if "aquatwin" in t.get("TopicArn", "").lower():
                topic_arn = t.get("TopicArn")
                break
        if not topic_arn:
            resp = sns.create_topic(Name="AquaTwin-Emergency-Alerts")
            topic_arn = resp.get("TopicArn")
            print(f"  v Created new SNS topic: {topic_arn}")
        else:
            print(f"  v Existing SNS topic found: {topic_arn}")
    except Exception as e:
        print(f"  X Failed to configure SNS topic: {e}")

    # Optional email subscription
    user_email = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ALERT_EMAIL", "").strip()
    if user_email and topic_arn:
        try:
            print(f"  Subscribing {user_email} to alerts...", end=" ", flush=True)
            sub_resp = sns.subscribe(
                TopicArn=topic_arn,
                Protocol="email",
                Endpoint=user_email
            )
            print("DONE")
            print(f"  IMPORTANT: Check your inbox ({user_email}) and click 'Confirm subscription'!")
        except Exception as e:
            print(f"FAILED ({e})")
    elif topic_arn:
        print(f"  (Tip: Run 'python deploy/setup_aws.py your-email@example.com' to subscribe your email)")

    # 6. Summary Output
    print("\n" + "=" * 75)
    print("  AWS Setup Complete! Summary of Configured Resources:")
    print("=" * 75)
    print(f"  S3 Bucket Name : {bucket_name}")
    print(f"  S3 Region      : {region}")
    print(f"  SNS Topic ARN  : {topic_arn}")
    print("\n  Uploaded Files:")
    for fname, url in uploaded_urls.items():
        print(f"    - {fname:<25} -> {url}")
    print("=" * 75)


if __name__ == "__main__":
    setup()
