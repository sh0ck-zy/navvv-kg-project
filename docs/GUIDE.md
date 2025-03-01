# 🎬 Project Guide & Potential Video Script

## 🎯 Introduction
- **Goal**: Enrich the **Semantic Scholar Knowledge Graph** with a `USES_DATASET` relationship.
- **Motivation**: Researchers need a **quick way** to see which datasets are commonly used in ML papers, track **trends**, and identify **potential research gaps**.

---

## 🔍 Steps Breakdown
### **1️⃣ Fetch Data from Semantic Scholar**
- Use the **API** to retrieve **papers**, **abstracts**, **authors**, and **citations**.
- Handle **API rate limits** using **batch requests & exponential backoff**.

### **2️⃣ Store & Explore Data**
- Use **pandas** to **clean & analyze** the extracted metadata.
- Save structured data in `data/raw/` and processed insights in `data/processed/`.

### **3️⃣ NLP Extraction of Dataset Mentions**
- **Problem**: The API doesn’t directly provide dataset usage.
- **Solution**:
  - Use **Named Entity Recognition (NER)** with **spaCy or SciBERT**.
  - Detect mentions of datasets like **ImageNet, CIFAR-10, SQuAD, GLUE** in abstracts.
  - Store detected datasets per paper.

### **4️⃣ Build a Knowledge Graph in Neo4j**
- Define **graph schema**:
  - **`(:Paper {title, year, citations})`**
  - **`(:Dataset {name})`**
  - **`(:Paper)-[:USES_DATASET]->(:Dataset)`**
- Insert cleaned data into **Neo4j** using **py2neo**.

### **5️⃣ Query & Visualize the Graph**
- Use **Cypher queries** to:
  - Find the **most commonly used datasets**.
  - Analyze **dataset trends over time**.
  - Suggest **related datasets for a topic**.
- Build **visualizations** using **Matplotlib, NetworkX, or Sigma.js**.

---

## 🚀 Product Vision: "Research Navigator"
This enriched Knowledge Graph can power a **Research Navigator Tool** to:
✅ **Filter papers** by dataset usage.
✅ **Show dataset trends** year by year.
✅ **Suggest related datasets** based on topic searches.
✅ **Enable smart search** for dataset-paper relationships.

Imagine a researcher searching for "**Reinforcement Learning datasets**" and instantly seeing **which papers use OpenAI Gym, Mujoco, or Atari-57**! 🚀

---

## 🎥 Potential YouTube Script Outline

### **1️⃣ Hook: "What Datasets Dominate AI Research?"**
📢 *"Are you curious which datasets dominate ML research? We analyzed thousands of papers to find out!"*

### **2️⃣ Problem Statement: "Finding ML Datasets is Hard!"**
🧐 *"Right now, there’s no easy way to search for which datasets are commonly used in research. It’s scattered across PDFs, papers, and blog posts... Let’s fix that!"*

### **3️⃣ Our Approach: "Extract, Analyze, Graph It!"**
🛠 *"We pull research papers from Semantic Scholar, extract dataset mentions using NLP, and store the results in a **Knowledge Graph** in Neo4j."*

### **4️⃣ Demo: "Top 5 Datasets in ML (2023)"**
📊 *"Check out the top datasets used in ML research this year... Are they what you expected?"*

### **5️⃣ Insights: "Emerging Trends in AI Datasets"**
🔎 *"Surprisingly, we noticed that **MNIST usage is dropping**, while newer datasets like **CLIP & GPT-4’s datasets are rising**."*

### **6️⃣ Future Work: "What’s Next?"**
🚀 *"Next steps include improving NLP accuracy with **SciBERT**, adding **more datasets**, and integrating this tool with **ArXiv & Hugging Face**."*

### **7️⃣ Conclusion: "Building the Future of AI Research"**
🎤 *"With this graph-powered dataset explorer, finding the right research just got easier. Imagine what we can do next!"*


---

## 📌 Next Steps to Finalize the Project
| **Task** | **Priority** | **Status** |
|----------|-------------|------------|
| **Fix API Rate Limiting** | 🔥 HIGH | ✅ Implement retry & batch processing. |
| **Process & Clean Data** | 🔥 HIGH | ⚠️ Needs validation & structuring. |
| **Extract Datasets via NLP** | 🔥 HIGH | ⚠️ Needs improvement in accuracy. |
| **Load Data into Neo4j** | 🔥 HIGH | ⚠️ Nodes & relationships setup missing. |
| **Write Cypher Queries** | ⚡ MEDIUM | ❌ Not yet implemented. |
| **Create Graph Visualizations** | ⚡ MEDIUM | ❌ Missing in notebook. |
| **Finalize Documentation & Scripts** | 🚀 MEDIUM | ⚠️ README & API docs need finalization. |

---

## 💡 Final Thoughts
This project is a **game-changer** for **ML researchers & data scientists**. If done right, it can become the foundation for **a tool like Google Scholar but for datasets**. Let’s make it happen! 🔥🚀

