
# Semantic Scholar Knowledge Graph Enrichment for nAVVV

**Author**: João Pereira  
**Date**: 2025-03-01

## Overview

This project aims to **enrich and mine** the existing Semantic Scholar Knowledge Graph to include a new relationship: **USES_DATASET**. By extracting dataset mentions from ML papers (fetched via the Semantic Scholar API), we can:

- Identify which datasets are most frequently used in research.
- Track trends over time (e.g., usage growth for a specific dataset).
- Potentially discover gaps or under-explored datasets.

## Repository Structure

- **notebooks/**: Jupyter notebooks (the main solution is `01_semantic_scholar_kg_enrichment.ipynb`).
- **scripts/**: Python scripts for tasks like data fetching, NLP, etc.
- **data/**:
  - `raw/`: holds original downloaded data.
  - `processed/`: holds any cleaned or processed data.
- **docs/**:
  - `GUIDE.md`: Detailed instructions, product vision, and potential YouTube video script.
- **Dockerfile** & **docker-compose.yml**: For containerizing the environment and Neo4j.
- **requirements.txt**: Lists Python dependencies.

## Quick Start

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/sh0ck-zy/navvv-kg-project.git
   cd navvv-kg-project
