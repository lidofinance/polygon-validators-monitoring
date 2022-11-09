FROM node:16.17.0-alpine3.16 as base

FROM base as build
WORKDIR /app

COPY package.json yarn.lock ./
COPY nest*.json ts*.json build*.json ./
RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean
COPY --chown=node:node ./src ./src
RUN yarn build

FROM base as prod
ENV NODE_ENV production

WORKDIR /app

RUN apk add --no-cache tini=0.19.0-r0
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json nest*.json ts*.json ./

USER node

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD sh -c "wget -nv -t1 --spider http://localhost:$PORT/health" || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start:prod"]
