# Use a lightweight Python image
FROM python:3.9-slim

# Create an app directory
WORKDIR /app

# Copy requirements to install first
COPY requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the files
COPY . /app

# Expose port 8888 for Jupyter
EXPOSE 8888

# Default command will start the notebook
CMD ["jupyter", "notebook", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]