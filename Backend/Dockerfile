FROM golang:1.22-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o campusfood .

FROM alpine:3.21

WORKDIR /app

COPY --from=build /app/campusfood ./campusfood
COPY --from=build /app/migration ./migration
COPY --from=build /app/uploads ./uploads

EXPOSE 8000

CMD ["./campusfood"]

