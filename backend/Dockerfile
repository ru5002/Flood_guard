FROM node:22-bookworm

# Install Python and pip for ML scripts
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Setup ML environment
WORKDIR /ml
COPY ml/requirements.txt ./
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt
COPY ml /ml

# Setup Backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --only=production
COPY backend/ ./

EXPOSE 5000
CMD ["npm", "start"]
