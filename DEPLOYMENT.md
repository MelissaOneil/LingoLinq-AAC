# LingoLinq-AAC Deployment Guide
## Migration from Render to Google Cloud Run

This guide provides step-by-step instructions for deploying LingoLinq-AAC to Google Cloud Run.

**Architecture Overview:**
- **Web Application:** Cloud Run (Puma web server, auto-scaling 1-10 instances)
- **Database:** Cloud SQL PostgreSQL
- **Cache/Jobs:** Memorystore Redis
- **Storage:** AWS S3 + CloudFront (existing, not migrated)
- **Email:** AWS SES (existing, not migrated)
- **Background Workers:** Cloud Run service (deployed separately after web is stable)
- **Scheduled Tasks:** Cloud Scheduler
- **CI/CD:** Cloud Build with GitHub triggers

**Deployment Strategy:**
1. Deploy web service first, verify it works
2. Add background workers as separate Cloud Run service
3. Set up Cloud Scheduler for cron jobs

---

## Phase 1: Infrastructure Setup

### Prerequisites

1. **Install Google Cloud SDK:**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate:**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. **Set project variables (customize these):**
   ```bash
   export PROJECT_ID="lingolinq-aac-prod"
   export REGION="us-central1"
   export SERVICE_NAME="lingolinq-web"
   export DB_INSTANCE_NAME="lingolinq-db"
   export REDIS_INSTANCE_NAME="lingolinq-redis"
   export VPC_CONNECTOR_NAME="lingolinq-vpc"
   export ARTIFACT_REPO_NAME="lingolinq"

   gcloud config set project $PROJECT_ID
   gcloud config set compute/region $REGION
   ```

### 1.1 Enable Required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  vpcaccess.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  compute.googleapis.com
```

**Estimated time:** 2-3 minutes

### 1.2 Create VPC Network (if not using default)

```bash
# Option 1: Use default VPC (recommended for simplicity)
export VPC_NETWORK="default"

# Option 2: Create custom VPC (more control)
gcloud compute networks create lingolinq-vpc \
  --subnet-mode=auto \
  --bgp-routing-mode=regional

export VPC_NETWORK="lingolinq-vpc"
```

### 1.3 Create VPC Access Connector

**CRITICAL:** This connector allows Cloud Run to access Redis and Cloud SQL via private IP.

```bash
gcloud compute networks vpc-access connectors create $VPC_CONNECTOR_NAME \
  --region=$REGION \
  --network=$VPC_NETWORK \
  --range=10.8.0.0/28 \
  --min-instances=2 \
  --max-instances=3 \
  --machine-type=e2-micro
```

**Cost:** ~$13/month for 2 instances running continuously

**Verify connector:**
```bash
gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME \
  --region=$REGION
```

**Estimated time:** 3-5 minutes

### 1.4 Create Cloud SQL PostgreSQL Instance

**Development/Staging:**
```bash
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --network=$VPC_NETWORK \
  --no-assign-ip \
  --database-flags=max_connections=100 \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4
```

**Production:**
```bash
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=$REGION \
  --network=$VPC_NETWORK \
  --no-assign-ip \
  --availability-type=REGIONAL \
  --database-flags=max_connections=200 \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --enable-bin-log
```

**Cost:**
- Development (db-f1-micro): ~$10/month
- Production (db-n1-standard-2): ~$140/month

**Set root password:**
```bash
gcloud sql users set-password postgres \
  --instance=$DB_INSTANCE_NAME \
  --password=$(openssl rand -base64 32)
```

**Create application database:**
```bash
gcloud sql databases create coughdrop-production \
  --instance=$DB_INSTANCE_NAME
```

**Create application user:**
```bash
export DB_USER="lingolinq_app"
export DB_PASSWORD=$(openssl rand -base64 32)

gcloud sql users create $DB_USER \
  --instance=$DB_INSTANCE_NAME \
  --password=$DB_PASSWORD

# Save these credentials - you'll need them!
echo "Database User: $DB_USER"
echo "Database Password: $DB_PASSWORD"
```

**Get connection name (needed for Cloud Run):**
```bash
gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)'

# Save this output - it will be like: project-id:region:instance-name
export CLOUD_SQL_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format='value(connectionName)')
echo "Cloud SQL Connection Name: $CLOUD_SQL_CONNECTION_NAME"
```

**Estimated time:** 5-10 minutes

### 1.5 Create Memorystore Redis Instance

**Development/Staging:**
```bash
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --network=$VPC_NETWORK \
  --tier=basic \
  --size=1 \
  --redis-version=redis_6_x \
  --enable-auth
```

**Production:**
```bash
gcloud redis instances create $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --network=$VPC_NETWORK \
  --tier=standard \
  --size=2 \
  --redis-version=redis_6_x \
  --enable-auth \
  --replica-count=1
```

**Cost:**
- Development (1GB Basic): ~$40/month
- Production (2GB Standard with replica): ~$125/month

**Get Redis connection details:**
```bash
export REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(host)')

export REDIS_PORT=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(port)')

export REDIS_AUTH=$(gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format='value(authString)')

# Build Redis URL
export REDIS_URL="redis://:${REDIS_AUTH}@${REDIS_HOST}:${REDIS_PORT}/0"
echo "Redis URL: $REDIS_URL"
```

**Estimated time:** 5-10 minutes

### 1.6 Create Artifact Registry Repository

```bash
gcloud artifacts repositories create $ARTIFACT_REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Docker images for LingoLinq-AAC"
```

**Configure Docker authentication:**
```bash
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

**Estimated time:** 1 minute

### 1.7 Set Up Secret Manager

Create secrets for all sensitive environment variables. This keeps credentials out of environment variables.

**Core secrets:**
```bash
# Generate secure random keys
openssl rand -hex 64 | gcloud secrets create secure-encryption-key --data-file=-
openssl rand -hex 64 | gcloud secrets create secure-nonce-key --data-file=-
openssl rand -hex 64 | gcloud secrets create cookie-key --data-file=-

# Database URL
echo "postgresql://${DB_USER}:${DB_PASSWORD}@/coughdrop-production?host=/cloudsql/${CLOUD_SQL_CONNECTION_NAME}" | \
  gcloud secrets create database-url --data-file=-

# Redis URL
echo "$REDIS_URL" | gcloud secrets create redis-url --data-file=-
```

**AWS credentials (for S3, SES, SNS):**
```bash
# You'll need to provide your actual AWS credentials
echo "YOUR_AWS_ACCESS_KEY" | gcloud secrets create aws-key --data-file=-
echo "YOUR_AWS_SECRET_KEY" | gcloud secrets create aws-secret --data-file=-
echo "YOUR_SES_KEY" | gcloud secrets create ses-key --data-file=-
echo "YOUR_SES_SECRET" | gcloud secrets create ses-secret --data-file=-
```

**Stripe keys:**
```bash
echo "YOUR_STRIPE_SECRET_KEY" | gcloud secrets create stripe-secret-key --data-file=-
echo "YOUR_STRIPE_PUBLIC_KEY" | gcloud secrets create stripe-public-key --data-file=-
```

**Third-party API tokens:**
```bash
echo "YOUR_OPENSYMBOLS_TOKEN" | gcloud secrets create opensymbols-token --data-file=-
echo "YOUR_GOOGLE_TRANSLATE_TOKEN" | gcloud secrets create google-translate-token --data-file=-
# Add other API tokens as needed (see Appendix A for full list)
```

**List all secrets:**
```bash
gcloud secrets list
```

### 1.8 Grant IAM Permissions

**Allow Cloud Build to deploy to Cloud Run:**
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

**Allow Cloud Run to access secrets:**
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Allow Cloud Run to connect to Cloud SQL:**
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Phase 2: Update cloudbuild.yaml

Update the substitution variables in `cloudbuild.yaml`:

```yaml
substitutions:
  _PROJECT_ID: 'lingolinq-aac-prod'              # Your GCP project ID
  _REGION: 'us-central1'                          # Your GCP region
  _SERVICE_NAME: 'lingolinq-web'                  # Cloud Run service name
  _CLOUD_SQL_CONNECTION_NAME: 'lingolinq-aac-prod:us-central1:lingolinq-db'  # From step 1.4
  _ARTIFACT_REGISTRY_REPO: 'lingolinq'            # Artifact Registry repo name
```

**Verify the file:**
```bash
cat cloudbuild.yaml | grep -A 5 "substitutions:"
```

**Commit changes:**
```bash
git add cloudbuild.yaml
git commit -m "Configure Cloud Build substitution variables for GCP deployment"
git push origin main
```

---

## Phase 3: Initial Deployment

### 3.1 Create Cloud Build Trigger

**Via Console (Recommended):**
1. Go to Cloud Build > Triggers: https://console.cloud.google.com/cloud-build/triggers
2. Click "Create Trigger"
3. Name: `lingolinq-deploy-main`
4. Event: Push to branch
5. Source: Connect your GitHub repository
6. Branch: `^main$`
7. Configuration: Cloud Build configuration file (cloudbuild.yaml)
8. Click "Create"

**Via gcloud:**
```bash
gcloud builds triggers create github \
  --name="lingolinq-deploy-main" \
  --repo-name="LingoLinq-AAC" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region=$REGION
```

### 3.2 Manual Initial Deployment

Before relying on automatic triggers, deploy manually to verify everything works:

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_PROJECT_ID=$PROJECT_ID,_REGION=$REGION,_SERVICE_NAME=$SERVICE_NAME,_CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,_ARTIFACT_REGISTRY_REPO=$ARTIFACT_REPO_NAME \
  --timeout=30m
```

**Monitor build progress:**
```bash
# In Cloud Console:
# https://console.cloud.google.com/cloud-build/builds

# Or via CLI:
gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')
```

**Expected build time:** 15-25 minutes (Ember compilation is slow)

### 3.3 Configure Cloud Run Service

The `cloudbuild.yaml` creates the service, but you may need to add environment variables and secrets:

**Add non-sensitive environment variables:**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars="RAILS_ENV=production,RACK_ENV=production,RAILS_LOG_TO_STDOUT=true,RAILS_SERVE_STATIC_FILES=true,DEFAULT_HOST=www.lingolinq-aac.com,UPLOADS_S3_BUCKET=lingolinq-uploads,STATIC_S3_BUCKET=lingolinq-static,UPLOADS_S3_CDN_REGION=us-east-1,SES_REGION=us-east-1,SNS_REGION=us-east-1,RAILS_MAX_THREADS=5,WEB_CONCURRENCY=3,MAX_THREADS=5"
```

**Add secrets as environment variables:**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-secrets="SECURE_ENCRYPTION_KEY=secure-encryption-key:latest,SECURE_NONCE_KEY=secure-nonce-key:latest,COOKIE_KEY=cookie-key:latest,DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,AWS_KEY=aws-key:latest,AWS_SECRET=aws-secret:latest,SES_KEY=ses-key:latest,SES_SECRET=ses-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_PUBLIC_KEY=stripe-public-key:latest,OPENSYMBOLS_TOKEN=opensymbols-token:latest,GOOGLE_TRANSLATE_TOKEN=google-translate-token:latest"
```

**Add VPC connector (CRITICAL for Redis access):**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --vpc-egress=private-ranges-only
```

**Add Cloud SQL connection:**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME
```

**Configure autoscaling:**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300
```

**Allow unauthenticated access (public web app):**
```bash
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### 3.4 Get Service URL and Test

```bash
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"

# Test health check
curl -I $SERVICE_URL

# Test application
curl $SERVICE_URL
```

### 3.5 Set Up Custom Domain (Optional)

```bash
# Add domain mapping
gcloud run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=www.lingolinq-aac.com \
  --region=$REGION

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain=www.lingolinq-aac.com \
  --region=$REGION
```

**Configure DNS:** Add the CNAME or A records shown in the output to your DNS provider.

### 3.6 Run Database Migrations Manually (First Time)

The Cloud Build pipeline runs migrations automatically, but for the first deployment, verify they worked:

```bash
# Check migration job logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=lingolinq-migrate" \
  --limit=50 \
  --format=json

# If you need to run migrations manually:
gcloud run jobs create lingolinq-migrate-manual \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SECURE_ENCRYPTION_KEY=secure-encryption-key:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rails,db:migrate"

# Execute the job
gcloud run jobs execute lingolinq-migrate-manual --region=$REGION
```

### 3.7 Create Initial Admin User

```bash
# Connect to the service and run console commands
gcloud run services proxy $SERVICE_NAME --region=$REGION &
PROXY_PID=$!

# Wait for proxy to start
sleep 5

# Run Rails console via Cloud Run job
gcloud run jobs create lingolinq-console \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SECURE_ENCRYPTION_KEY=secure-encryption-key:latest,SECURE_NONCE_KEY=secure-nonce-key:latest,COOKIE_KEY=cookie-key:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rails,console"

# Or seed the database (creates example user: username=example, password=password)
gcloud run jobs create lingolinq-seed \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SECURE_ENCRYPTION_KEY=secure-encryption-key:latest,SECURE_NONCE_KEY=secure-nonce-key:latest,COOKIE_KEY=cookie-key:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rails,db:seed"

gcloud run jobs execute lingolinq-seed --region=$REGION

kill $PROXY_PID
```

---

## Phase 4: Add Workers (Deploy After Web is Stable)

Background workers process jobs from Redis queues (board updates, log processing, email sending, etc.).

### 4.1 Create Worker Cloud Run Service

**Build worker image (reuses same Dockerfile with different CMD):**

Create `cloudbuild-worker.yaml`:
```yaml
steps:
  # Build image
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '--cache-from', '${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:latest',
      '-t', '${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:$COMMIT_SHA',
      '-t', '${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:latest',
      '--build-arg', 'WORKER_MODE=true',
      '.'
    ]

  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:$COMMIT_SHA']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:latest']

  # Deploy worker to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'lingolinq-worker'
      - '--image=${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO}/lingolinq-worker:$COMMIT_SHA'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--no-traffic'
      - '--command=bundle'
      - '--args=exec,rake,environment,resque:work'
      - '--set-env-vars=RAILS_ENV=production,RACK_ENV=production,QUEUES=priority,default,slow,whenever,INTERVAL=0.1,TERM_CHILD=1'
      - '--vpc-connector=${_VPC_CONNECTOR_NAME}'
      - '--vpc-egress=private-ranges-only'
      - '--add-cloudsql-instances=${_CLOUD_SQL_CONNECTION_NAME}'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--max-instances=5'
      - '--no-cpu-throttling'

timeout: 1800s

substitutions:
  _PROJECT_ID: 'lingolinq-aac-prod'
  _REGION: 'us-central1'
  _CLOUD_SQL_CONNECTION_NAME: 'lingolinq-aac-prod:us-central1:lingolinq-db'
  _VPC_CONNECTOR_NAME: 'lingolinq-vpc'
  _ARTIFACT_REGISTRY_REPO: 'lingolinq'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
```

**Or deploy worker manually:**
```bash
# Deploy worker service (uses same image, different command)
gcloud run deploy lingolinq-worker \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --platform=managed \
  --no-traffic \
  --command=bundle \
  --args="exec,rake,environment,resque:work" \
  --set-env-vars="RAILS_ENV=production,RACK_ENV=production,QUEUES=priority,default,slow,whenever,INTERVAL=0.1,TERM_CHILD=1,RAILS_MAX_THREADS=5" \
  --update-secrets="SECURE_ENCRYPTION_KEY=secure-encryption-key:latest,SECURE_NONCE_KEY=secure-nonce-key:latest,COOKIE_KEY=cookie-key:latest,DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,AWS_KEY=aws-key:latest,AWS_SECRET=aws-secret:latest,SES_KEY=ses-key:latest,SES_SECRET=ses-secret:latest" \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --vpc-egress=private-ranges-only \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=5 \
  --no-cpu-throttling
```

**Important worker flags:**
- `--no-traffic`: Workers don't serve HTTP requests
- `--no-cpu-throttling`: Keep CPU always allocated (workers run continuously)
- `--min-instances=1`: Always have at least 1 worker running
- `QUEUES=priority,default,slow,whenever`: Process all queue types

### 4.2 Monitor Worker Health

```bash
# Check worker logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-worker" \
  --limit=50 \
  --format=json

# Check Redis queue sizes (requires connecting to Redis)
# You'll need to run this from a Cloud Run job or instance with VPC access
```

### 4.3 Set Up Cloud Scheduler for Cron Jobs

Create scheduled jobs that run rake tasks:

```bash
# Create service account for Cloud Scheduler
gcloud iam service-accounts create cloud-scheduler \
  --display-name="Cloud Scheduler Service Account"

# Grant permission to invoke Cloud Run
gcloud run services add-iam-policy-binding lingolinq-worker \
  --region=$REGION \
  --member="serviceAccount:cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**Create scheduled jobs:**

```bash
# Hourly: Generate log summaries
gcloud scheduler jobs create http generate-log-summaries \
  --schedule="0 * * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"generate_log_summaries"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Hourly: Push remote logs
gcloud scheduler jobs create http push-remote-logs \
  --schedule="15 * * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"push_remote_logs"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Hourly: Check for log mergers
gcloud scheduler jobs create http check-log-mergers \
  --schedule="30 * * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"check_for_log_mergers"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Hourly: Advance goals
gcloud scheduler jobs create http advance-goals \
  --schedule="45 * * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"advance_goals"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Daily at 3 AM: Check for expiring subscriptions
gcloud scheduler jobs create http check-expiring-subscriptions \
  --schedule="0 3 * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"check_for_expiring_subscriptions"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Daily at 4 AM: Transcode errored records
gcloud scheduler jobs create http transcode-errored-records \
  --schedule="0 4 * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"transcode_errored_records"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Daily at 5 AM: Flush users
gcloud scheduler jobs create http flush-users \
  --schedule="0 5 * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"flush_users"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION

# Daily at 6 AM: Clean old deleted boards
gcloud scheduler jobs create http clean-deleted-boards \
  --schedule="0 6 * * *" \
  --uri="https://lingolinq-worker-xxx.run.app" \
  --http-method=POST \
  --message-body='{"task":"clean_old_deleted_boards"}' \
  --oidc-service-account-email="cloud-scheduler@${PROJECT_ID}.iam.gserviceaccount.com" \
  --location=$REGION
```

**Alternative: Use Cloud Run Jobs for scheduled tasks:**

Instead of HTTP endpoints, you can run rake tasks directly as Cloud Run Jobs:

```bash
# Create a job for each scheduled task
gcloud run jobs create generate-log-summaries \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SECURE_ENCRYPTION_KEY=secure-encryption-key:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rake,generate_log_summaries"

# Schedule it with Cloud Scheduler
gcloud scheduler jobs create http generate-log-summaries-trigger \
  --schedule="0 * * * *" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/generate-log-summaries:run" \
  --http-method=POST \
  --oauth-service-account-email="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --location=$REGION
```

---

## Phase 5: Monitoring & Operations

### 5.1 View Logs

**Web service logs:**
```bash
# Tail logs in real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-web" \
  --format=json

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-web" \
  --limit=100 \
  --format=json

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-web AND severity>=ERROR" \
  --limit=50
```

**Worker logs:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-worker" \
  --limit=100
```

**Cloud Build logs:**
```bash
gcloud logging read "resource.type=build" \
  --limit=50
```

**Cloud SQL logs:**
```bash
gcloud logging read "resource.type=cloudsql_database AND resource.labels.database_id=${CLOUD_SQL_CONNECTION_NAME}" \
  --limit=50
```

### 5.2 Update Environment Variables

**Update non-sensitive variable:**
```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="DEFAULT_HOST=new-domain.com"
```

**Update secret:**
```bash
# Add new version to secret
echo "new_secret_value" | gcloud secrets versions add stripe-secret-key --data-file=-

# Cloud Run automatically uses latest version, or force redeployment:
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-secrets="STRIPE_SECRET_KEY=stripe-secret-key:latest"
```

### 5.3 Scale Service

**Manual scaling:**
```bash
# Increase max instances
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --max-instances=20

# Reduce min instances (save costs)
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=0

# Increase resources per instance
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=4Gi \
  --cpu=4
```

**View current configuration:**
```bash
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format=yaml
```

### 5.4 Roll Back Deployment

```bash
# List revisions
gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION

# Roll back to previous revision
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=lingolinq-web-abc123=100

# Or roll back to specific revision
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=REVISION_NAME=100
```

### 5.5 Run Database Migrations

Migrations run automatically during Cloud Build, but to run manually:

```bash
gcloud run jobs execute lingolinq-migrate --region=$REGION --wait
```

### 5.6 Access Rails Console

```bash
# Create console job (one-time)
gcloud run jobs create lingolinq-console \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,SECURE_ENCRYPTION_KEY=secure-encryption-key:latest,SECURE_NONCE_KEY=secure-nonce-key:latest,COOKIE_KEY=cookie-key:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rails,console" \
  --task-timeout=30m

# Execute console (interactive mode not supported, use for one-off commands)
gcloud run jobs execute lingolinq-console --region=$REGION
```

**For interactive console, use Cloud Shell or local connection via Cloud SQL Proxy.**

### 5.7 Monitor Costs

```bash
# View billing account
gcloud billing accounts list

# View project costs (requires Billing API)
gcloud services enable cloudbilling.googleapis.com

# Check quota usage
gcloud compute project-info describe --project=$PROJECT_ID
```

**Cost dashboards:**
- Billing: https://console.cloud.google.com/billing
- Cloud Run metrics: https://console.cloud.google.com/run

### 5.8 Set Up Alerts

```bash
# Create uptime check
gcloud monitoring uptime create lingolinq-uptime \
  --resource-type=uptime-url \
  --monitored-resource="https://${SERVICE_URL}/" \
  --check-interval=5m

# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="LingoLinq High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-expression='
    fetch cloud_run_revision
    | metric "run.googleapis.com/request_count"
    | filter resource.service_name == "lingolinq-web"
    | align rate(1m)
    | group_by [resource.service_name], [value_request_count_aggregate: aggregate(value.request_count)]
    | condition value_request_count_aggregate > 0.05
  '
```

---

## Phase 6: Troubleshooting

### 6.1 Common Issues

#### Issue: "VPC Access connector not found"

**Cause:** Cloud Run can't find the VPC connector for Redis/Cloud SQL access.

**Solution:**
```bash
# Verify connector exists
gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME \
  --region=$REGION

# Ensure Cloud Run service has VPC connector configured
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --vpc-egress=private-ranges-only
```

#### Issue: "Could not connect to Redis"

**Causes:**
1. VPC connector not configured
2. Redis AUTH string not in REDIS_URL
3. Wrong Redis host/port

**Solution:**
```bash
# Get Redis connection details
gcloud redis instances describe $REDIS_INSTANCE_NAME \
  --region=$REGION \
  --format=yaml

# Verify REDIS_URL secret is correct
gcloud secrets versions access latest --secret=redis-url

# Should be format: redis://:AUTH_STRING@HOST:PORT/0
# Example: redis://:abc123xyz@10.1.2.3:6379/0
```

#### Issue: "Database connection failed"

**Causes:**
1. Cloud SQL connection name incorrect
2. Database URL incorrect
3. Cloud SQL instance not ready

**Solution:**
```bash
# Verify Cloud SQL connection name
gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)'

# Check database URL format (should use Unix socket)
gcloud secrets versions access latest --secret=database-url

# Correct format: postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
# NOT: postgresql://user:pass@host:5432/dbname

# Ensure Cloud Run has Cloud SQL instances configured
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME
```

#### Issue: "Asset compilation failed during build"

**Cause:** Ember build timeout or Node.js memory issues.

**Solution:**
```bash
# Increase Cloud Build timeout in cloudbuild.yaml
timeout: 3600s  # 1 hour

# Or increase machine type for build
options:
  machineType: 'E2_HIGHCPU_8'

# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')
```

#### Issue: "Cold start timeout"

**Cause:** First request to instance takes too long (loading Rails + Ember assets).

**Solution:**
```bash
# Set min-instances to avoid cold starts
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --min-instances=1

# Or increase timeout
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --timeout=300
```

#### Issue: "Memory limit exceeded"

**Cause:** Instance runs out of 2GB RAM.

**Solution:**
```bash
# Increase memory allocation
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=4Gi

# Check memory usage in logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-web AND textPayload=~'memory'" \
  --limit=50
```

#### Issue: "Workers not processing jobs"

**Causes:**
1. Worker service not running
2. Wrong Redis URL in worker
3. No CPU allocated (throttled)

**Solution:**
```bash
# Check worker status
gcloud run services describe lingolinq-worker \
  --region=$REGION

# Ensure no CPU throttling
gcloud run services update lingolinq-worker \
  --region=$REGION \
  --no-cpu-throttling

# Check worker logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=lingolinq-worker" \
  --limit=100
```

#### Issue: "Migrations failed during deployment"

**Cause:** Database migration job fails, blocking deployment.

**Solution:**
```bash
# Check migration job logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=lingolinq-migrate" \
  --limit=50

# Run migrations manually
gcloud run jobs execute lingolinq-migrate --region=$REGION --wait

# If migration job doesn't exist, create it
gcloud run jobs create lingolinq-migrate \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --set-env-vars="RAILS_ENV=production" \
  --command="bundle" \
  --args="exec,rails,db:migrate"
```

### 6.2 Debugging Tools

**Check service health:**
```bash
curl -I $SERVICE_URL
curl $SERVICE_URL/health  # If health endpoint exists
```

**Inspect running containers:**
```bash
# Get list of running revisions
gcloud run revisions list \
  --service=$SERVICE_NAME \
  --region=$REGION

# Describe specific revision
gcloud run revisions describe REVISION_NAME \
  --region=$REGION \
  --format=yaml
```

**Test VPC connectivity:**
```bash
# Create test job to check Redis
gcloud run jobs create test-redis \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO_NAME}/lingolinq-web:latest \
  --region=$REGION \
  --vpc-connector=$VPC_CONNECTOR_NAME \
  --set-secrets="REDIS_URL=redis-url:latest" \
  --command="bash" \
  --args="-c,echo PING | redis-cli -u \$REDIS_URL"

gcloud run jobs execute test-redis --region=$REGION --wait
```

**Check IAM permissions:**
```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

### 6.3 Performance Optimization

**Enable request compression:**
```bash
# Already enabled by default in Cloud Run, but verify in app
# Add to config/environments/production.rb:
# config.middleware.use Rack::Deflater
```

**Add CDN for static assets:**
```bash
# Use Cloud CDN with Cloud Run
gcloud compute backend-services create lingolinq-backend \
  --global

gcloud compute backend-services add-backend lingolinq-backend \
  --global \
  --serverless-deployment-platform=run \
  --serverless-deployment-region=$REGION \
  --serverless-deployment-resource=$SERVICE_NAME

gcloud compute url-maps create lingolinq-lb \
  --default-service=lingolinq-backend

gcloud compute target-https-proxies create lingolinq-https \
  --url-map=lingolinq-lb \
  --ssl-certificates=lingolinq-cert

gcloud compute forwarding-rules create lingolinq-https-rule \
  --global \
  --target-https-proxy=lingolinq-https \
  --ports=443
```

**Optimize database connections:**
```bash
# Tune RAILS_MAX_THREADS based on instance count and Cloud SQL limits
# Cloud SQL db-n1-standard-2 supports 200 connections
# If max-instances=10, threads=5: 10 * 5 = 50 connections (safe)
# If max-instances=20, threads=5: 20 * 5 = 100 connections (safe)

# Update thread count
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="RAILS_MAX_THREADS=5,WEB_CONCURRENCY=3,MAX_THREADS=5"
```

---

## Appendix A: Complete Environment Variables Reference

### Core Application Settings (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `RAILS_ENV` | Rails environment | `production` | No |
| `RACK_ENV` | Rack environment | `production` | No |
| `RAILS_LOG_TO_STDOUT` | Log to stdout for Cloud Run | `true` | No |
| `RAILS_SERVE_STATIC_FILES` | Enable static file serving | `true` | No |
| `PORT` | Server port | `8080` | No |
| `SECURE_ENCRYPTION_KEY` | Encryption key for sensitive data | 128-char hex | **Yes** |
| `SECURE_NONCE_KEY` | Nonce generation key | 128-char hex | **Yes** |
| `COOKIE_KEY` | Cookie encryption key | 128-char hex | **Yes** |
| `DEFAULT_HOST` | Default hostname for URLs | `www.lingolinq-aac.com` | No |

### Database Settings (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://user:pass@/db?host=/cloudsql/project:region:instance` | **Yes** |
| `RAILS_MAX_THREADS` | Database pool size | `5` | No |

### Redis Settings (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `REDIS_URL` | Redis connection URL | `redis://:authstring@10.1.2.3:6379/0` | **Yes** |

### Puma Web Server Settings

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `WEB_CONCURRENCY` | Number of Puma workers | `3` | No |
| `MAX_THREADS` | Max threads per worker | `5` | No |

### AWS S3 Storage (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `AWS_KEY` | AWS access key | `AKIAIOSFODNN7EXAMPLE` | **Yes** |
| `AWS_SECRET` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | **Yes** |
| `STATIC_S3_BUCKET` | Bucket for static assets | `lingolinq-static` | No |
| `UPLOADS_S3_BUCKET` | Bucket for user uploads | `lingolinq-uploads` | No |
| `UPLOADS_S3_CDN` | CloudFront CDN URL | `https://d1234567890.cloudfront.net` | No |
| `UPLOADS_S3_CDN_ID` | CloudFront distribution ID | `E1234567890ABC` | No |
| `UPLOADS_S3_CDN_REGION` | S3 region | `us-east-1` | No |

### AWS SES Email (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `SES_KEY` | SES access key | `AKIAIOSFODNN7EXAMPLE` | **Yes** |
| `SES_SECRET` | SES secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | **Yes** |
| `SES_REGION` | SES region | `us-east-1` | No |
| `DEFAULT_EMAIL_FROM` | From email address | `noreply@lingolinq-aac.com` | No |
| `SYSTEM_ERROR_EMAIL` | System error notifications | `errors@lingolinq-aac.com` | No |
| `NEW_REGISTRATION_EMAIL` | New user notifications | `registrations@lingolinq-aac.com` | No |

### AWS Transcoding

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `TRANSCODER_AUDIO_PIPELINE` | Transcoder pipeline ID for audio | `1234567890123-abcdef` | No |
| `TRANSCODER_VIDEO_PIPELINE` | Transcoder pipeline ID for video | `1234567890123-ghijkl` | No |
| `TRANSCODER_REGION` | Transcoder region | `us-east-1` | No |

### AWS SNS

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `SNS_ARN` | SNS topic ARNs (comma-separated) | `arn:aws:sns:us-east-1:123:topic1,arn:aws:sns:us-east-1:123:topic2` | No |
| `SNS_REGION` | SNS region | `us-east-1` | No |
| `SMS_ORIGINATORS` | SMS originator phone numbers | `+15551234567,+15557654321` | No |
| `SMS_ENCRYPTION_KEY` | SMS encryption key | 64-char hex | **Yes** |

### Stripe Payments (Required)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` | **Yes** |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key | `pk_live_...` | No |

### OpenSymbols Integration

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `OPENSYMBOLS_TOKEN` | OpenSymbols API token | `your_token_here` | **Yes** |
| `OPENSYMBOLS_S3_BUCKET` | OpenSymbols S3 bucket | `opensymbols` | No |
| `SYMBOL_PROXY_KEY` | Symbol proxy key | `your_key_here` | **Yes** |

### Third-Party APIs (Optional)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `GOOGLE_TRANSLATE_TOKEN` | Google Translate API key | `AIzaSy...` | **Yes** |
| `GOOGLE_PLACES_TOKEN` | Google Places API key | `AIzaSy...` | **Yes** |
| `MAPS_KEY` | Google Maps API key | `AIzaSy...` | **Yes** |
| `GCSE_KEY` | Google Custom Search Engine key | `AIzaSy...` | **Yes** |
| `FLICKR_KEY` | Flickr API key | `abc123...` | **Yes** |
| `PIXABAY_KEY` | Pixabay API key | `123-abc...` | **Yes** |
| `42_MATTERS_ACCESS_TOKEN` | 42 Matters Play Store API | `your_token` | **Yes** |

### LessonPix Integration (Optional)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `LESSONPIX_PID` | LessonPix partner ID | `12345` | No |
| `LESSONPIX_SECRET` | LessonPix secret | `your_secret` | **Yes** |
| `LESSONPIX_USER` | LessonPix user | `username` | No |
| `LESSONPIX_MD5` | LessonPix MD5 hash | `hash` | **Yes** |

### ZenDesk Support (Optional)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `ZENDESK_USER` | ZenDesk email | `support@lingolinq-aac.com` | No |
| `ZENDESK_TOKEN` | ZenDesk API token | `your_token` | **Yes** |
| `ZENDESK_DOMAIN` | ZenDesk domain | `lingolinq.zendesk.com` | No |

### WebSocket Server (Optional)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `CDWEBSOCKET_URL` | WebSocket server URL | `wss://ws.lingolinq-aac.com` | No |
| `CDWEBSOCKET_SHARED_VERIFIER` | WebSocket verification token | `random_token` | **Yes** |
| `CDWEBSOCKET_ENCRYPTION_KEY` | WebSocket encryption key | 64-char hex | **Yes** |

### Social Links / App Store Links (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `IOS_STORE_URL` | iOS App Store URL | `https://apps.apple.com/...` |
| `PLAY_STORE_URL` | Google Play Store URL | `https://play.google.com/...` |
| `KINDLE_STORE_URL` | Amazon Kindle Store URL | `https://www.amazon.com/...` |
| `WINDOWS_32_BIT_URL` | Windows 32-bit download | `https://...` |
| `WINDOWS_64_BIT_URL` | Windows 64-bit download | `https://...` |
| `BLOG_URL` | Blog URL | `https://blog.lingolinq-aac.com` |
| `TWITTER_URL` | Twitter profile URL | `https://twitter.com/lingolinq` |
| `TWITTER_HANDLE` | Twitter handle | `@lingolinq` |
| `FACEBOOK_URL` | Facebook page URL | `https://facebook.com/lingolinq` |
| `YOUTUBE_URL` | YouTube channel URL | `https://youtube.com/lingolinq` |
| `SUPPORT_URL` | Support site URL | `https://support.lingolinq-aac.com` |

### Deployment/Notifications (Optional)

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `SLACK_NOTIFICATION_URL` | Slack webhook for deploy notifications | `https://hooks.slack.com/services/...` | **Yes** |

### Default Profiles (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `DEFAULT_SUPERVISOR_PROFILE_ID` | Default supervisor profile ID | `1_12345` |
| `DEFAULT_COMMUNICATOR_PROFILE_ID` | Default communicator profile ID | `1_67890` |

---

## Appendix B: Cost Estimates

### Development/Staging Environment

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Cloud Run (Web) | 1 min instance, 2Gi RAM, 2 CPU | ~$30 |
| Cloud SQL PostgreSQL | db-f1-micro (shared CPU, 0.6GB) | ~$10 |
| Memorystore Redis | 1GB Basic | ~$40 |
| VPC Access Connector | 2 e2-micro instances | ~$13 |
| Cloud Build | 120 build-minutes/month | Free |
| Artifact Registry | <0.5GB storage | Free |
| Secret Manager | <6 secrets | Free |
| Cloud Logging | <50GB/month | ~$5 |
| **Total** | | **~$98/month** |

### Production Environment

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Cloud Run (Web) | 1-10 instances, 2Gi RAM, 2 CPU | ~$150-300 |
| Cloud Run (Workers) | 1-5 instances, 2Gi RAM, 2 CPU | ~$75-150 |
| Cloud SQL PostgreSQL | db-n1-standard-2 (2 vCPU, 7.5GB, regional HA) | ~$280 |
| Memorystore Redis | 2GB Standard with replica | ~$125 |
| VPC Access Connector | 2-3 e2-micro instances | ~$13-20 |
| Cloud Build | 500 build-minutes/month | ~$5 |
| Artifact Registry | ~2GB storage | ~$1 |
| Secret Manager | <100 secrets, <10K accesses | ~$5 |
| Cloud Logging | ~100GB/month | ~$20 |
| Cloud Scheduler | 8 jobs | ~$3 |
| Cloud Load Balancer (if using CDN) | Minimal traffic | ~$20-50 |
| **Total** | | **~$697-954/month** |

**Not included (existing AWS costs):**
- S3 storage & transfer
- CloudFront CDN
- SES email sending
- SNS notifications
- Elastic Transcoder

### Cost Optimization Tips

1. **Reduce Cloud Run min-instances to 0** for non-production:
   - Saves ~$30/instance/month
   - Trade-off: Cold start delays (5-10 seconds)

2. **Use Cloud SQL shared core instances for dev:**
   - db-f1-micro: $10/month vs. db-n1-standard-1: $70/month
   - Sufficient for low-traffic environments

3. **Use Redis Basic tier for dev:**
   - No replica: $40/month vs. Standard: $125/month
   - Single point of failure (acceptable for dev)

4. **Optimize build frequency:**
   - Use Cloud Build triggers only for main/production branches
   - Manual deployments for feature branches
   - Each build costs ~$0.04 (120 free minutes/month)

5. **Tune autoscaling:**
   - Start with max-instances=5 for production
   - Monitor actual usage and adjust
   - Over-provisioning wastes money

6. **Use VPC connector efficiently:**
   - Share connector across multiple Cloud Run services
   - Set min-instances=2, max-instances=3 (not higher)

7. **Archive old logs:**
   - Cloud Logging retention: 30 days
   - Export to Cloud Storage for long-term: ~$0.02/GB/month

8. **Right-size Cloud SQL:**
   - Monitor connection count and CPU usage
   - Start with db-n1-standard-1 ($140/month)
   - Scale up only if needed

9. **Consider Cloud SQL connection pooling:**
   - Use PgBouncer in separate Cloud Run instance
   - Reduce connection overhead
   - Allows smaller Cloud SQL instance

10. **Use preemptible instances for non-critical workers:**
    - Not currently supported in Cloud Run
    - Consider Cloud Run Jobs for batch processing

---

## Appendix C: Migration Checklist

### Pre-Migration

- [ ] Export Render PostgreSQL database
- [ ] Document all environment variables from Render
- [ ] Test application locally with production-like setup
- [ ] Set up AWS S3, SES, SNS (if not already configured)
- [ ] Obtain all third-party API keys
- [ ] Plan DNS cutover strategy

### GCP Setup

- [ ] Create GCP project
- [ ] Enable billing
- [ ] Enable all required APIs
- [ ] Set up VPC network and connector
- [ ] Create Cloud SQL instance
- [ ] Create Memorystore Redis instance
- [ ] Create Artifact Registry repository
- [ ] Set up all Secret Manager secrets
- [ ] Configure IAM permissions

### Application Deployment

- [ ] Update `cloudbuild.yaml` with correct values
- [ ] Push code to GitHub
- [ ] Create Cloud Build trigger
- [ ] Run initial manual deployment
- [ ] Import database from Render
- [ ] Run database migrations
- [ ] Verify web application works
- [ ] Test all critical features

### Worker & Scheduled Jobs

- [ ] Deploy worker Cloud Run service
- [ ] Set up Cloud Scheduler jobs
- [ ] Verify background jobs process correctly
- [ ] Test scheduled task execution

### DNS & Domain

- [ ] Set up Cloud Run custom domain
- [ ] Update DNS records
- [ ] Verify SSL certificate provisioned
- [ ] Test application on custom domain

### Monitoring & Alerts

- [ ] Set up uptime checks
- [ ] Configure error rate alerts
- [ ] Set up cost alerts
- [ ] Configure log-based metrics
- [ ] Set up Slack/email notifications

### Post-Migration

- [ ] Monitor application for 24-48 hours
- [ ] Check error rates and performance
- [ ] Verify all background jobs running
- [ ] Test payment processing
- [ ] Validate email sending
- [ ] Test file uploads to S3
- [ ] Decomission Render resources

---

## Appendix D: Quick Reference Commands

```bash
# Set variables (customize these)
export PROJECT_ID="lingolinq-aac-prod"
export REGION="us-central1"
export SERVICE_NAME="lingolinq-web"

# Tail logs
gcloud logging tail "resource.labels.service_name=lingolinq-web"

# Deploy manually
gcloud builds submit --config=cloudbuild.yaml

# Update environment variable
gcloud run services update $SERVICE_NAME --region=$REGION --update-env-vars="KEY=value"

# Update secret
echo "new_value" | gcloud secrets versions add secret-name --data-file=-

# Scale service
gcloud run services update $SERVICE_NAME --region=$REGION --max-instances=20

# Run migrations
gcloud run jobs execute lingolinq-migrate --region=$REGION --wait

# Roll back
gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=REVISION=100

# Check service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# List revisions
gcloud run revisions list --service=$SERVICE_NAME --region=$REGION

# View costs
open "https://console.cloud.google.com/billing"
```

---

## Support & Additional Resources

- **Google Cloud Documentation:** https://cloud.google.com/run/docs
- **LingoLinq GitHub Issues:** https://github.com/YOUR_ORG/LingoLinq-AAC/issues
- **Google Cloud Support:** https://cloud.google.com/support
- **Community:** OpenAAC Slack channel

---

**Last Updated:** 2025-11-13
**Version:** 1.0
