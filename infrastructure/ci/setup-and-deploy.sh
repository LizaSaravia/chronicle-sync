#!/bin/bash

# Check if the CloudFormation stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name chronicle-sync-${ENV_NAME} 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "Infrastructure stack doesn't exist. Creating..."
    
    # Create the CloudFormation stack
    aws cloudformation create-stack \
        --stack-name chronicle-sync-${ENV_NAME} \
        --template-body file://infrastructure/cloudformation/chronicle-sync-infrastructure.yaml \
        --capabilities CAPABILITY_IAM

    # Wait for stack creation to complete
    aws cloudformation wait stack-create-complete \
        --stack-name chronicle-sync-${ENV_NAME}
    
    if [ $? -ne 0 ]; then
        echo "Stack creation failed"
        exit 1
    fi
    
    echo "Infrastructure stack created successfully"
fi

# Update the ECS service
aws ecs update-service \
    --cluster chronicle-sync-${ENV_NAME} \
    --service sync \
    --force-new-deployment