import json
import uuid
import time
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Replace with your actual table name
TABLE_NAME = 'QueuePatients' 
# Replace with your actual bucket name
BUCKET_NAME = 'vizzi-analytics-data'

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Extract patient info
        name = body.get('name', 'Anonymous')
        mobile = body.get('mobile', '')
        complaint = body.get('complaint', '')
        clinic_id = body.get('clinicId')
        doctor_id = body.get('doctorId', '')
        
        if not clinic_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing clinicId'})
            }

        # Generate Token
        timestamp = int(time.time() * 1000)
        id = str(uuid.uuid4())
        token = f"AI-{id[:4].upper()}" # Simplified token generation for AI mode
        
        # 1. Store in DynamoDB (Live Queue)
        table = dynamodb.Table(TABLE_NAME)
        item = {
            'id': id,
            'clinicId': clinic_id,
            'doctorId': doctor_id,
            'name': name,
            'mobileNumber': mobile,
            'complaint': complaint,
            'tokenNumber': token,
            'status': 'waiting',
            'timestamp': timestamp,
            'mode': 'AI_ASSISTANT'
        }
        table.put_item(Item=item)

        # 2. Log to S3 (Historical Analytics)
        analytics_data = {
            'id': id,
            'timestamp': timestamp,
            'clinicId': clinic_id,
            'mode': 'AI_ASSISTANT',
            'interaction': {
                'name': name,
                'complaint': complaint,
                'has_audio': True
            }
        }
        
        date_str = datetime.now().strftime('%Y-%m-%d')
        s3_key = f"interactions/{clinic_id}/{date_str}/{id}.json"
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(analytics_data),
            ContentType='application/json'
        )

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'message': 'Check-in successful',
                'tokenNumber': token,
                'id': id
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
