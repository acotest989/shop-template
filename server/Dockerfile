# Built from the shop's root, so it can copy the frontend:
#   docker build -f server/Dockerfile --build-arg PB_VERSION=$(cat server/.pb-version) -t shop .
#
# PB_VERSION has no default on purpose: the version lives in server/.pb-version, and
# a default here would be a second place to forget.

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

COPY server/pb_migrations /pb/pb_migrations
COPY server/pb_hooks /pb/pb_hooks

# The mail templates and the server's sentences, beside pb_hooks as in the repository:
# pb_hooks/mailer.js and pb_hooks/lang.js read them from ../mail and ../lang on every use.
COPY server/mail /pb/mail
COPY server/lang /pb/lang

# The frontend, named file by file. Copying the repository and deleting server/ would
# work until somebody forgot, and then pb_data/data.db would be a public download.
COPY index.html main.js app.js favicon.svg /pb/pb_public/
COPY assets   /pb/pb_public/assets
COPY lang     /pb/pb_public/lang
COPY lib      /pb/pb_public/lib
COPY models   /pb/pb_public/models
COPY pages    /pb/pb_public/pages
COPY partials /pb/pb_public/partials
COPY services /pb/pb_public/services
COPY stores   /pb/pb_public/stores

# The database. Mount it, or the first redeploy takes every account with it.
VOLUME /pb/pb_data

EXPOSE 8090

# pb_public next to the binary is the default, so serving the app needs no flag.
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
