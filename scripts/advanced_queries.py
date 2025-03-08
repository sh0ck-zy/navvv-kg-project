import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

def query_dataset_trends_by_venue(graph, top_datasets):
    """
    Query the KG for dataset usage trends grouped by venue.
    Returns a DataFrame with columns: dataset, venue, and usage_count.
    """
    query = """
    MATCH (p:Paper)-[r:USES_DATASET]->(d:Dataset)
    WHERE d.name IN $top_datasets AND exists(p.venue) AND p.venue <> ""
    RETURN d.name AS dataset, p.venue AS venue, COUNT(p) AS usage_count
    ORDER BY usage_count DESC
    """
    result = graph.run(query, top_datasets=top_datasets).data()
    df = pd.DataFrame(result)
    print("\n📊 Dataset Usage Trends by Venue:")
    print(df)
    if not df.empty:
        plt.figure(figsize=(12, 6))
        pivot = df.pivot(index="venue", columns="dataset", values="usage_count").fillna(0)
        pivot.plot(kind="bar")
        plt.title("Dataset Usage by Venue")
        plt.xlabel("Venue")
        plt.ylabel("Number of Papers")
        plt.legend(title="Dataset")
        plt.tight_layout()
        plt.show()
    return df

def query_author_collaboration(graph, top_datasets):
    """
    Query the KG to retrieve author collaboration data for papers that use the specified datasets.
    Returns a DataFrame with columns: dataset, author1, author2, and shared_papers.
    """
    query = """
    MATCH (a1:Author)-[:AUTHORED]->(p:Paper)-[:USES_DATASET]->(d:Dataset)<-[:AUTHORED]-(a2:Author)
    WHERE d.name IN $top_datasets AND a1 <> a2
    RETURN d.name AS dataset, a1.name AS author1, a2.name AS author2, COUNT(p) AS shared_papers
    ORDER BY shared_papers DESC
    LIMIT 20
    """
    result = graph.run(query, top_datasets=top_datasets).data()
    df = pd.DataFrame(result)
    print("\n📊 Author Collaboration Network for Datasets:")
    print(df)
    if not df.empty:
        plt.figure(figsize=(12, 6))
        sns.barplot(x="shared_papers", y="dataset", hue="author1", data=df)
        plt.title("Top Author Collaborations by Dataset")
        plt.xlabel("Shared Papers")
        plt.ylabel("Dataset")
        plt.legend(title="Author 1", bbox_to_anchor=(1, 1))
        plt.tight_layout()
        plt.show()
    return df

def run_advanced_queries(graph):
    """
    Runs several advanced queries on the knowledge graph and returns their results.
    This includes:
      - Top 10 Datasets Overall
      - Dataset Usage by Source
      - Dataset Usage Trends Over Time
      - Dataset Co-occurrence Analysis
      - Top Authors Using Popular Datasets
      - Dataset Usage Trends by Venue (new)
      - Author Collaboration Network for Datasets (new)
    """
    # ----- Query 1: Top Datasets Overall -----
    query_top = """
    MATCH (p:Paper)-[r:USES_DATASET]->(d:Dataset)
    RETURN d.name AS dataset, COUNT(p) AS usage_count
    ORDER BY usage_count DESC
    LIMIT 10
    """
    result_top = graph.run(query_top).data()
    df_top = pd.DataFrame(result_top)
    print("\n📊 Top 10 Datasets Overall:")
    print(df_top)
    if not df_top.empty:
        plt.figure(figsize=(12, 6))
        sns.barplot(y="dataset", x="usage_count", data=df_top.sort_values("usage_count"))
        plt.title("Top 10 Datasets by Usage Count")
        plt.xlabel("Number of Papers")
        plt.ylabel("Dataset")
        plt.tight_layout()
        plt.show()

    # Determine top datasets to use in subsequent queries
    top_datasets = df_top.head(5)["dataset"].tolist() if not df_top.empty else []
    
    # ----- Query 2: Dataset Usage by Source -----
    query_source = """
    MATCH (p:Paper)-[r:USES_DATASET]->(d:Dataset),
          (p)-[:PUBLISHED_IN]->(s:Source)
    WHERE d.name IN $top_datasets
    RETURN d.name AS dataset, s.name AS source, COUNT(p) AS count
    ORDER BY dataset, count DESC
    """
    result_source = graph.run(query_source, top_datasets=top_datasets).data()
    df_source = pd.DataFrame(result_source)
    print("\n📊 Top Dataset Usage by Source:")
    if not df_source.empty:
        pivot_df = df_source.pivot(index="dataset", columns="source", values="count").fillna(0)
        print(pivot_df)
        plt.figure(figsize=(12, 6))
        pivot_df.plot(kind="bar")
        plt.title("Top Dataset Usage by Source")
        plt.xlabel("Dataset")
        plt.ylabel("Number of Papers")
        plt.legend(title="Source")
        plt.tight_layout()
        plt.show()
    
    # ----- Query 3: Dataset Usage Trends Over Time -----
    query_trend = """
    MATCH (p:Paper)-[r:USES_DATASET]->(d:Dataset),
          (p)-[:PUBLISHED_YEAR]->(y:Year)
    WHERE d.name IN $top_datasets
    RETURN d.name AS dataset, y.value AS year, COUNT(p) AS count
    ORDER BY year, dataset
    """
    result_trend = graph.run(query_trend, top_datasets=top_datasets).data()
    df_trend = pd.DataFrame(result_trend)
    print("\n📊 Dataset Usage Trends Over Time:")
    if not df_trend.empty:
        pivot_trend = df_trend.pivot(index="year", columns="dataset", values="count").fillna(0)
        print(pivot_trend)
        plt.figure(figsize=(14, 7))
        for col in pivot_trend.columns:
            plt.plot(pivot_trend.index, pivot_trend[col], marker='o', label=col)
        plt.title("Dataset Usage Trends Over Time")
        plt.xlabel("Year")
        plt.ylabel("Number of Papers")
        plt.legend(title="Dataset")
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()
    
    # ----- Query 4: Dataset Co-occurrence Analysis -----
    query_cooccurrence = """
    MATCH (p1:Paper)-[r:USES_DATASET]->(d1:Dataset),
          (p1:Paper)-[r2:USES_DATASET]->(d2:Dataset)
    WHERE d1.name < d2.name
    RETURN d1.name AS dataset1, d2.name AS dataset2, COUNT(p1) AS co_occurrence
    ORDER BY co_occurrence DESC
    LIMIT 15
    """
    result_cooccurrence = graph.run(query_cooccurrence).data()
    df_cooccurrence = pd.DataFrame(result_cooccurrence)
    print("\n📊 Dataset Co-occurrence Analysis:")
    print(df_cooccurrence)
    if not df_cooccurrence.empty and len(df_cooccurrence) > 3:
        from networkx import Graph as NxGraph
        import networkx as nx
        G = NxGraph()
        for _, row in df_cooccurrence.iterrows():
            d1, d2, weight = row["dataset1"], row["dataset2"], row["co_occurrence"]
            G.add_edge(d1, d2, weight=weight)
        node_degrees = dict(G.degree())
        node_sizes = [v * 100 for v in node_degrees.values()]
        edge_weights = [G[u][v]['weight'] * 0.5 for u, v in G.edges()]
        plt.figure(figsize=(14, 10))
        pos = nx.spring_layout(G, seed=42)
        nx.draw_networkx_nodes(G, pos, node_size=node_sizes, node_color='skyblue', alpha=0.7)
        nx.draw_networkx_edges(G, pos, width=edge_weights, alpha=0.5, edge_color='gray')
        nx.draw_networkx_labels(G, pos, font_size=10)
        plt.title("Dataset Co-occurrence Network")
        plt.axis('off')
        plt.tight_layout()
        plt.show()
    
    # ----- Query 5: Top Authors Using Popular Datasets -----
    query_authors = """
    MATCH (a:Author)-[:AUTHORED]->(p:Paper)-[:USES_DATASET]->(d:Dataset)
    WHERE d.name IN $top_datasets
    RETURN a.name AS author, d.name AS dataset, COUNT(p) AS paper_count
    ORDER BY paper_count DESC
    LIMIT 20
    """
    result_authors = graph.run(query_authors, top_datasets=top_datasets).data()
    df_authors = pd.DataFrame(result_authors)
    print("\n📊 Top Authors Using Popular Datasets:")
    print(df_authors)
    if not df_authors.empty:
        plt.figure(figsize=(14, 8))
        sns.barplot(x="author", y="paper_count", hue="dataset", data=df_authors.head(10))
        plt.title("Top Authors by Dataset Usage")
        plt.xlabel("Author")
        plt.ylabel("Number of Papers")
        plt.xticks(rotation=45, ha='right')
        plt.legend(title="Dataset")
        plt.tight_layout()
        plt.show()
    
    # ----- New Query A: Dataset Usage Trends by Venue -----
    df_venue = query_dataset_trends_by_venue(graph, top_datasets)
    
    # ----- New Query B: Author Collaboration Network for Datasets -----
    df_author_collab = query_author_collaboration(graph, top_datasets)
    
    return df_top, df_trend, df_cooccurrence, df_authors, df_venue, df_author_collab