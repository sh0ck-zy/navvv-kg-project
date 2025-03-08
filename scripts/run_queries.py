# run_queries.py
from py2neo import Graph
from advanced_queries import run_advanced_queries  # Make sure this file is in your scripts folder

# Neo4j Connection (use same credentials as before)
NEO4J_URI = "bolt://localhost:7687"  # Update if needed
NEO4J_USER = "neo4j"
NEO4J_PASS = "password123"  # Update if needed

graph = Graph(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
print("✅ Connected to Neo4j successfully!")

# Run the advanced queries
advanced_results = run_advanced_queries(graph)
print("✅ Advanced queries completed.")