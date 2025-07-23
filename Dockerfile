# Stage 1: Build the NestJS application
FROM node:20-alpine 

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files
# A wildcard is used to ensure both package.json and package-lock.json are copied
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Define the command to start the application
CMD ["node", "dist/main"]