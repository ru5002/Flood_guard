FROM node:22-bookworm

ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Build a self-contained ML runtime and train the model inside the image.
WORKDIR /ml
COPY ml/requirements.txt ./
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PIP_DEFAULT_TIMEOUT=300
ENV PIP_RETRIES=10
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt
COPY ml /ml
COPY ["Aththanagalu Oya Hydrological Time-Series Dataset.xlsx", "/Aththanagalu Oya Hydrological Time-Series Dataset.xlsx"]
RUN python /ml/train.py

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

EXPOSE 5000
CMD ["npm", "start"]
