FROM node:16-alpine3.14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Build artifacts
RUN npm run build

EXPOSE 3000

# Run application
CMD [ "npm", "run", "start" ]
