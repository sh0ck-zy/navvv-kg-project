# extract_semantic_data.py
import requests
import json
import os
import time
import pandas as pd
from tqdm import tqdm

API_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
RAW_DATA_PATH = "data/raw/papers_semanticscholar.json"
OUTPUT_PATH = "data/processed/papers_semanticscholar_clean.json"

def fetch_semantic_papers(query="machine learning", num_batches=50, batch_size=100):
    """
    Fetch papers from Semantic Scholar API.
    
    Note: The standard search endpoint enforces that offset + limit must be < 1000.
    If num_batches * batch_size exceeds or equals 1000, we adjust num_batches accordingly.
    
    (This code is available if you need to fetch new data; by default, the main() function loads
    the existing RAW_DATA_PATH file.)
    """
    max_allowed = 1000
    if num_batches * batch_size >= max_allowed:
        num_batches = (max_allowed - 1) // batch_size
        print(f"Adjusted num_batches to {num_batches} to comply with API limits (offset+limit < 1000).")
    
    papers = []
    for i in tqdm(range(num_batches), desc="Fetching Semantic Scholar batches"):
        offset = i * batch_size
        params = {
            "query": query,
            "fields": "paperId,title,abstract,year,authors,citationCount,referenceCount,venue,fieldsOfStudy",
            "offset": offset,
            "limit": batch_size
        }
        attempt = 0
        wait_time = 5
        while attempt < 5:
            resp = requests.get(API_URL, params=params)
            if resp.status_code == 200:
                batch = resp.json().get("data", [])
                papers.extend(batch)
                break
            elif resp.status_code == 429:
                print(f"Rate limited. Sleeping for {wait_time} seconds...")
                time.sleep(wait_time)
                wait_time *= 2
                attempt += 1
            else:
                print(f"API Error: {resp.status_code} - {resp.text}")
                break
        time.sleep(3)
    return papers

def clean_and_downsample(papers, target=500):
    """
    Filter out papers missing essential fields and downsample to the top 'target' relevant papers.
    
    Relevance is determined by:
      - Presence of title, abstract, and year.
      - A minimum citationCount (>=10).
    
    The remaining papers are sorted by citationCount (descending) and the top target papers are selected.
    """
    df = pd.DataFrame(papers)
    # Filter out papers missing essential fields: title, abstract, year
    df = df[df['title'].notnull() & df['abstract'].notnull() & df['year'].notnull()]
    # Keep papers with at least 10 citations
    df = df[df['citationCount'].fillna(0) >= 10]
    
    print(f"✅ After cleaning, {len(df)} papers remain")
    # Sort by citationCount (descending) as a proxy for relevance
    df = df.sort_values(by="citationCount", ascending=False)
    # Downsample to top 'target' papers
    if len(df) > target:
        df = df.head(target)
        print(f"✅ Downsampled to top {len(df)} relevant papers")
    return df.to_dict(orient="records")

def save_raw_data(papers, path=RAW_DATA_PATH):
    """Save raw papers data to file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=4)
    print(f"✅ Raw data saved: {len(papers)} papers.")

def load_raw_data(path=RAW_DATA_PATH):
    """Load raw data from file."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        print("❌ Raw data file not found.")
        return []

def save_clean_data(cleaned, path=OUTPUT_PATH):
    """Save cleaned papers data to file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=4)
    print(f"✅ Cleaned Semantic Scholar data saved to {path}")

def main():
    """
    Main processing function.
    By default, this script loads the already existing big raw file from RAW_DATA_PATH,
    then cleans and downsamples it to produce a relevant subset (default target is 500 papers).
    
    Uncomment the API extraction code below if you wish to fetch new data.
    """
    # --- Uncomment the following block to fetch new data from the API ---
    # print(f"🔍 Fetching new Semantic Scholar data for query: 'machine learning'")
    # papers = fetch_semantic_papers(query="machine learning", num_batches=50, batch_size=100)
    # save_raw_data(papers, RAW_DATA_PATH)
    # ---------------------------------------------------------------------
    
    # Load raw data from the existing big file
    print(f"📄 Loading existing raw Semantic Scholar data from {RAW_DATA_PATH}")
    raw_papers = load_raw_data(RAW_DATA_PATH)
    
    cleaned_papers = clean_and_downsample(raw_papers, target=500)
    save_clean_data(cleaned_papers, OUTPUT_PATH)

if __name__ == "__main__":
    main()
