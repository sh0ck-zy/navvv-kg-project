# 📖 Semantic Scholar API Guide

## 🔍 Overview
The **Semantic Scholar API** provides structured access to academic paper metadata, authors, citations, references, and more. This document serves as an internal guide for querying and processing data using this API.

## 🌍 Base URL
```
https://api.semanticscholar.org/graph/v1/
```

## 🔑 Authentication
- No API key is required for basic queries.
- To increase rate limits, apply for an API key [here](https://www.semanticscholar.org/product/api#api-key-form).

---

# 🔎 Available API Endpoints

## 📄 Paper Search
Search for academic papers by keyword.
```
GET /graph/v1/paper/search
```
### 🛠️ Query Parameters:
| Parameter        | Type      | Description |
|-----------------|----------|-------------|
| `query`         | `string`  | Search term (e.g., `"deep learning"`). |
| `fields`        | `string`  | Fields to return (e.g., `title,abstract,year`). |
| `offset`        | `integer` | Pagination offset (default: `0`). |
| `limit`         | `integer` | Number of results (default: `100`, max: `100`). |

### 🔹 Example Request:
```python
import requests

url = "https://api.semanticscholar.org/graph/v1/paper/search"
params = {
    "query": "machine learning",
    "fields": "title,abstract,year,authors,referenceCount,citationCount",
    "offset": 0,
    "limit": 100
}
resp = requests.get(url, params=params)
print(resp.json())
```

## 📄 Get Paper Details
Retrieve metadata for a specific paper.
```
GET /graph/v1/paper/{paper_id}
```
### 🛠️ Query Parameters:
| Parameter  | Type    | Description |
|------------|--------|-------------|
| `fields`   | string | Requested fields (e.g., `title,authors,abstract`). |

### 🔹 Example Request:
```python
paper_id = "649def34f8be52c8b66281af98ae884c09aef38b"
url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"
params = {"fields": "title,abstract,authors,citations"}
resp = requests.get(url, params=params)
print(resp.json())
```

## 👤 Get Author Details
Retrieve details about an author, including their publications.
```
GET /graph/v1/author/{author_id}
```
### 🛠️ Query Parameters:
| Parameter  | Type    | Description |
|------------|--------|-------------|
| `fields`   | string | Fields to return (e.g., `name,affiliations,papers`). |

### 🔹 Example Request:
```python
author_id = "1741101"
url = f"https://api.semanticscholar.org/graph/v1/author/{author_id}"
params = {"fields": "name,affiliations,papers.title,papers.year"}
resp = requests.get(url, params=params)
print(resp.json())
```

## 🔄 Fetch Citations of a Paper
Retrieve the list of papers that cite a given paper.
```
GET /graph/v1/paper/{paper_id}/citations
```
### 🔹 Example Request:
```python
paper_id = "649def34f8be52c8b66281af98ae884c09aef38b"
url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/citations"
params = {"fields": "title,year,authors"}
resp = requests.get(url, params=params)
print(resp.json())
```

## 🔗 Fetch References of a Paper
Retrieve papers that a given paper references.
```
GET /graph/v1/paper/{paper_id}/references
```
### 🔹 Example Request:
```python
paper_id = "649def34f8be52c8b66281af98ae884c09aef38b"
url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/references"
params = {"fields": "title,year,authors"}
resp = requests.get(url, params=params)
print(resp.json())
```

---

## 📦 API Response Payload
Example JSON response:
```json
{
  "data": [
    {
      "paperId": "abc12345",
      "title": "Deep Learning for Image Recognition",
      "abstract": "This paper explores deep learning techniques for...",
      "year": 2023,
      "authors": [
        {"name": "John Doe"},
        {"name": "Jane Smith"}
      ],
      "referenceCount": 25,
      "citationCount": 300
    }
  ]
}
```

## 🔍 What Papers Are We Extracting?
| Field | Description |
|-----------|----------------|
| **Title** | The title of the paper. |
| **Abstract** | A short summary of the paper (if available). |
| **Year** | The publication year of the paper. |
| **Authors** | The list of authors who wrote the paper. |
| **Reference Count** | The number of papers referenced in this paper. |
| **Citation Count** | The number of times this paper has been cited by others. |

## 📜 Purpose of This Data
- **Trend Analysis:** Identify the most cited research in Machine Learning.
- **Dataset Enrichment:** Track which datasets are commonly used in ML research.
- **Knowledge Graph Integration:** Store relationships between papers and datasets in **Neo4j**.

---

