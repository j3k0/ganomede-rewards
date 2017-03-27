#!/bin/bash

BASE_URL="${BASE_URL:-http://localhost:8000}"
PREFIX="${BASE_URL}/REPLACE_THIS_WITH_YOUR_THING/v1"
API_SECRET=${API_SECRET:-1234}

#
# Example service configuration
#
# COORDINATOR_URL="${COORDINATOR_PORT_8000_TCP_PROTOCOL:-http}://${COORDINATOR_PORT_8000_TCP_ADDR:-directory}:${COORDINATOR_PORT_8000_TCP_PORT:-8000}"
# DIRECTORY_URL="${DIRECTORY_PORT_8000_TCP_PROTOCOL:-http}://${DIRECTORY_PORT_8000_TCP_ADDR:-directory}:${DIRECTORY_PORT_8000_TCP_PORT:-8000}"

#
# Example test user registration
#
# TEST_USER_ID=alice1
# TEST_PASSWORD=password1234
# TEST_USERNAME=Alice1
# TEST_TAG=alicei
# TEST_EMAIL=alice@email.com
# AUTH_TOKEN=`initializeTestUser`

. `dirname $0`/rest_api_helper.sh

# Testing basics: ping and about
it 'responds to /ping'
    curl $PREFIX/ping/ruok
    outputIncludes ruok

it 'responds to /about'
    curl $PREFIX/about
    outputIncludes '"type": "REPLACE_THIS_WITH_YOUR_THING"'
