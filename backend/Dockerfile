# syntax=docker/dockerfile:1.7
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
RUN mvn -B -f backend/pom.xml -DskipTests dependency:go-offline
COPY api api
COPY backend/src backend/src
RUN mvn -B -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S application && adduser -S -u 10001 -G application application
WORKDIR /application
COPY --from=build --chown=application:application /workspace/backend/target/url-shortener-backend-0.1.0-SNAPSHOT.jar application.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/urandom", "-jar", "/application/application.jar"]
