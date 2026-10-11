import boto3, sys
from botocore.exceptions import ClientError

REGION = "us-east-1"
print("boto3", boto3.__version__)
try:
    print("Identity:", boto3.client("sts", region_name=REGION).get_caller_identity()["Arn"])
except Exception as e:
    print("STS failed:", type(e).__name__, e); sys.exit(1)

# What the account can see
try:
    bd = boto3.client("bedrock", region_name=REGION)
    print("Nova models:", [m["modelId"] for m in bd.list_foundation_models(byProvider="Amazon")["modelSummaries"] if "nova" in m["modelId"]])
    print("Nova profiles:", [p["inferenceProfileId"] for p in bd.list_inference_profiles()["inferenceProfileSummaries"] if "nova" in p["inferenceProfileId"]])
except Exception as e:
    print("List failed:", type(e).__name__, e)

# Actual invocation
br = boto3.client("bedrock-runtime", region_name=REGION)
for mid in ["us.amazon.nova-pro-v1:0", "amazon.nova-pro-v1:0", "us.amazon.nova-lite-v1:0"]:
    try:
        r = br.converse(modelId=mid,
            messages=[{"role": "user", "content": [{"text": "Say hello in one word."}]}],
            inferenceConfig={"maxTokens": 20})
        print("OK  ", mid, "->", r["output"]["message"]["content"][0]["text"])
    except ClientError as e:
        print("FAIL", mid, e.response["Error"]["Code"], "-", e.response["Error"]["Message"])
    except Exception as e:
        print("FAIL", mid, type(e).__name__, e)