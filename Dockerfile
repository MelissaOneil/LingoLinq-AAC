# Multi-stage Dockerfile for Rails + Ember.js deployment to Google Cloud Run
# Stage 1: Builder - Build frontend assets and precompile Rails assets
FROM ruby:3.2.2-slim as builder

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    git \
    imagemagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 specifically (required for Ember 3.12)
# DO NOT use default Node.js package - Ember requires Node 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn bower && \
    rm -rf /var/lib/apt/lists/*

# Verify Node.js version
RUN node --version && npm --version

# Set working directory
WORKDIR /app

# Copy Gemfile and install Ruby dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install --jobs 4 --retry 3

# Copy package files for Ember frontend
COPY app/frontend/package.json app/frontend/yarn.lock app/frontend/bower.json ./app/frontend/

# Install Ember frontend dependencies
WORKDIR /app/app/frontend
RUN yarn install --frozen-lockfile && \
    bower install --allow-root --config.interactive=false

# Copy entire application
WORKDIR /app
COPY . .

# Build Ember frontend for production
WORKDIR /app/app/frontend
RUN npx ember build --environment production

# Precompile Rails assets
WORKDIR /app
RUN bundle exec rake assets:precompile

# Stage 2: Runtime - Slim production image
FROM ruby:3.2.2-slim

# Install runtime dependencies only
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    imagemagick \
    ghostscript \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy installed gems from builder
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy application code and compiled assets from builder
COPY --from=builder --chown=appuser:appuser /app /app

# Set environment variables for production
ENV RAILS_ENV=production \
    RACK_ENV=production \
    RAILS_SERVE_STATIC_FILES=true \
    RAILS_LOG_TO_STDOUT=true \
    PORT=8080

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Switch to non-root user
USER appuser

# Start Puma web server only
# Workers will be deployed as a separate Cloud Run service later
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
