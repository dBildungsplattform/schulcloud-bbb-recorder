# Schul-Cloud BigBlueButton Recorder

Export [BigBlueButton](https://github.com/bigbluebutton/bigbluebutton) recordings from the [HPI Schul-Cloud](https://github.com/schul-cloud) to video.

## Getting started

1. Clone this repository.
2. Initialize Git submodules: `git submodule update --init`
3. Install dependencies: `npm install`
4. Run the linter: `npm run lint` or `npm run lint -- --fix`
5. Run unit-tests: `npm run test` or `npm run test -- --watch`

## Running

The easiest way to run this project is via [Docker](https://www.docker.com/).

A [`Dockerfile`](./Dockerfile) is provided. Build an image by running:

```shell
docker build --tag schulcloud-bbb-recorder .
```

The service expects a few environment variables to be set. You can either specify these on the command-line when starting a container or load them from a file:

```shell
# Copy the provided example env file
cp .env.{example,local}

# Edit the file to match your setup
if [ -z "$VISUAL" ]; then $EDITOR .env.local; else echo $VISUAL .env.local; fi

# Then start a container from the image with your configuration
docker run --env-file .env.local schulcloud-bbb-recorder

# …or, set these values directly via the "run" command
docker run --env AMQP_URI=… schulcloud-bbb-recorder
```

For an example of how to get started with `docker-compose`, check out our [docker-compose.example.yml](./docker-compose.example.yml).

```shell
docker-compose --file docker-compose.example.yml build
docker-compose --file docker-compose.example.yml up
```

The image includes the [`dockerize`](https://github.com/jwilder/dockerize) utility in case you have to wait for the message broker or upload endpoint to become available before starting to process jobs.
