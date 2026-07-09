import os
import logging
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# AWS Credentials and Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_DEFAULT_REGION = os.getenv('AWS_DEFAULT_REGION')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

def get_s3_client():
    """Initializes and returns a boto3 S3 client."""
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION]):
        logger.error("AWS credentials or region are not fully configured in the .env file.")
        raise ValueError("Missing AWS credentials.")
    
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_DEFAULT_REGION
        )
        return s3_client
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
        raise

def upload_file(local_path, s3_key):
    """Uploads a local file to S3."""
    if not S3_BUCKET_NAME:
        logger.error("S3_BUCKET_NAME is not set in the .env file.")
        return False

    s3_client = get_s3_client()
    try:
        s3_client.upload_file(local_path, S3_BUCKET_NAME, s3_key)
        logger.info(f"Successfully uploaded {local_path} to s3://{S3_BUCKET_NAME}/{s3_key}")
        return True
    except ClientError as e:
        logger.error(f"ClientError uploading file: {e}")
        return False
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return False

def download_file(s3_key, local_path):
    """Downloads a file from S3 to local."""
    if not S3_BUCKET_NAME:
        logger.error("S3_BUCKET_NAME is not set in the .env file.")
        return False

    s3_client = get_s3_client()
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    try:
        s3_client.download_file(S3_BUCKET_NAME, s3_key, local_path)
        logger.info(f"Successfully downloaded s3://{S3_BUCKET_NAME}/{s3_key} to {local_path}")
        return True
    except ClientError as e:
        logger.error(f"ClientError downloading file: {e}")
        return False
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        return False

def list_files(prefix=""):
    """Lists all files in the bucket, optionally filtered by prefix."""
    if not S3_BUCKET_NAME:
        logger.error("S3_BUCKET_NAME is not set in the .env file.")
        return []

    s3_client = get_s3_client()
    try:
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=prefix)
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                files.append(obj['Key'])
            logger.info(f"Successfully listed {len(files)} files in s3://{S3_BUCKET_NAME} with prefix '{prefix}'")
        else:
            logger.info(f"No files found in s3://{S3_BUCKET_NAME} with prefix '{prefix}'")
        return files
    except ClientError as e:
        logger.error(f"ClientError listing files: {e}")
        return []
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        return []

def delete_file(s3_key):
    """Deletes a file from S3."""
    if not S3_BUCKET_NAME:
        logger.error("S3_BUCKET_NAME is not set in the .env file.")
        return False

    s3_client = get_s3_client()
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        logger.info(f"Successfully deleted s3://{S3_BUCKET_NAME}/{s3_key}")
        return True
    except ClientError as e:
        logger.error(f"ClientError deleting file: {e}")
        return False
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return False

def generate_presigned_url(s3_key, expiry_seconds=3600):
    """Returns a temporary public URL."""
    if not S3_BUCKET_NAME:
        logger.error("S3_BUCKET_NAME is not set in the .env file.")
        return None

    s3_client = get_s3_client()
    try:
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': S3_BUCKET_NAME,
                                                            'Key': s3_key},
                                                    ExpiresIn=expiry_seconds)
        logger.info(f"Successfully generated presigned URL for s3://{S3_BUCKET_NAME}/{s3_key}")
        return response
    except ClientError as e:
        logger.error(f"ClientError generating presigned URL: {e}")
        return None
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        return None
