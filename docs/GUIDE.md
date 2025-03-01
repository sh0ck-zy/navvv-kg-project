# Project Guide & Potential Video Script

## Introduction
- **Goal**: Enrich the Semantic Scholar Knowledge Graph with a `USES_DATASET` relationship.
- **Motivation**: Researchers want to quickly see which datasets are used in ML papers, identify trends, and find potential gaps.

## Steps Breakdown
1. **Fetch Data** from Semantic Scholar using their API.
2. **Store & Explore**: Use pandas for initial analysis.
3. **NLP Extraction**: Identify dataset mentions from abstracts (using spaCy or SciBERT).
4. **Build Knowledge Graph**: 
   - `Paper` nodes
   - `Dataset` nodes
   - `USES_DATASET` edges
5. **Query & Visualize** using Neo4j + Python (py2neo).

## Product Vision
- This enriched KG can power a "Research Navigator" tool:
  - Filter papers by dataset usage.
  - Show trending datasets year by year.
  - Suggest related datasets to a user searching for a particular domain.

## Potential YouTube Script Outline
1. **Hook**: "Are you curious which datasets dominate ML research?"
2. **Problem Statement**: "We often rely on guesswork or incomplete info. Let's fix that!"
3. **Our Approach**: 
   - "We retrieve papers from Semantic Scholar, run them through an NLP pipeline to detect datasets, and store it in a graph database."
4. **Demo**:
   - "Take a look at these top 5 datasets in 2022..."
5. **Insights**:
   - "Surprisingly, we noticed a shift from MNIST to newer variants..."
6. **Future Work**:
   - "We’ll integrate advanced NER (like SciBERT) and more comprehensive dataset lists."
7. **Conclusion**: "A powerful foundation for deeper ML research exploration."

