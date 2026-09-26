# Built from the shop's root:
#   docker build --build-arg PB_VERSION=$(cat .pb-version) -t shop .
#
# PB_VERSION has no default on purpose: the version lives in .pb-version, and a default here
# would be a second place to forget.

FROM alpine:3 AS download
ARG PB_VERSION
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip wget
WORKDIR /pb
RUN wget -q -O pb.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
 && unzip -q pb.zip pocketbase \
 && rm pb.zip

FROM alpine:3
RUN apk add --no-cache ca-certificates
WORKDIR /pb

COPY --from=download /pb/pocketbase /pb/pocketbase

# The three folders PocketBase looks for beside itself, as they are in the repository: what runs
# here is what ran on your machine. The database is not among them; it is the volume below.
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks      /pb/pb_hooks
COPY pb_public     /pb/pb_public

# The database. Mount it, or the first redeploy takes every account with it.
VOLUME /pb/pb_data

EXPOSE 8090

# Every folder where PocketBase looks by default, so serving the shop needs no flag.
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
