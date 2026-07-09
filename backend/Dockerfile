# Stage 1: Build the artifact
FROM maven:3.9.5-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Production execution environment
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root system group and user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build jar and change ownership
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

# Setup logs and uploads directories with proper ownership
RUN mkdir -p /app/logs /app/uploads && chown -R appuser:appgroup /app/logs /app/uploads

# Use the non-root user
USER appuser

EXPOSE 8080

# Environment variables with JVM optimizations
ENV JAVA_OPTS="-XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Healthcheck leveraging actuator endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep UP || exit 1

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
