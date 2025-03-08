// js/graph.js

class GraphManager {
  constructor() {
    this.graphData = { nodes: [], links: [] };
    this.filteredData = { nodes: [], links: [] };
    this.Graph = null;
    this.maxCitationCount = 0;
    this.minYear = 3000;
    this.maxYear = 0;
    this.selectedNode = null;
    this.cameraDistance = 200;
    this.cameraSpeed = 0.05;
    this.enableSmoothNavigation = true;
  }

  // Enhanced Shaders for better celestial appearance
  get vertexShader() {
    return `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  get paperFragmentShader() {
    return `
      uniform float u_time;
      uniform float u_brightness;
      uniform vec3 u_color;
      varying vec2 vUv;
      
      // Improved noise function for more realistic star appearance
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                  mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Soft pulsing effect
          float pulse = sin(u_time * 1.5) * 0.08 + 0.92;
          
          // Improved glow with smoother falloff
          float glow = smoothstep(0.5, 0.0, dist) * u_brightness * pulse;
          
          // Add subtle noise pattern for star-like texture
          float starNoise = noise(vUv * 5.0 + u_time * 0.1) * 0.1 + 0.9;
          
          // Core brightness
          float core = smoothstep(0.15, 0.0, dist) * 1.5;
          
          // Combining colors with improved blending
          vec3 color = u_color * glow * starNoise;
          color = mix(color, vec3(1.0, 0.98, 0.9), core * pulse);
          
          // Add subtle color variation based on position
          color += vec3(0.05, 0.02, 0.1) * noise(vUv * 2.0 + u_time * 0.05);
          
          gl_FragColor = vec4(color, glow);
      }
    `;
  }

  get authorFragmentShader() {
    return `
      uniform float u_time;
      uniform float u_brightness;
      uniform vec3 u_color;
      varying vec2 vUv;
      
      // Improved noise functions for nebula effect
      vec2 hash22(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      
      float noise(vec2 p) {
        const float K1 = 0.366025404; // (sqrt(3)-1)/2
        const float K2 = 0.211324865; // (3-sqrt(3))/6
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
        return dot(n, vec3(70.0));
      }
      
      void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Subtle slow pulse
          float pulse = sin(u_time * 0.8) * 0.05 + 0.95;
          
          // Base glow with softer edge
          float glow = smoothstep(0.5, 0.05, dist) * u_brightness * pulse;
          
          // Create nebula-like patterns with layered noise
          float n1 = noise((vUv - 0.5) * 3.0 + u_time * 0.02);
          float n2 = noise((vUv - 0.5) * 6.0 - u_time * 0.01);
          float n3 = noise((vUv - 0.5) * 9.0 + u_time * 0.03);
          
          float nebula = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
          nebula = nebula * 0.6 + 0.4;
          
          // Add color variation to create more dynamic nebula appearance
          vec3 nebulaColor = u_color * 1.2;
          nebulaColor += vec3(0.2, 0.0, 0.3) * n1;
          nebulaColor -= vec3(0.0, 0.1, 0.2) * n2;
          
          // Combine everything
          vec3 color = nebulaColor * glow * nebula;
          
          // Add bright core
          float core = smoothstep(0.2, 0.0, dist) * pulse * 1.2;
          color = mix(color, vec3(1.0, 0.9, 1.0), core);
          
          gl_FragColor = vec4(color, glow * 0.9);
      }
    `;
  }

  // Creates the custom node mesh using enhanced shaders
  createCosmicNode(node) {
    const isPaper = node.type === "paper";
    let size, color;

    if (isPaper) {
      // Use logarithmic scale for more balanced sizing based on citations
      const citationFactor = Math.log(node.citationCount + 1) / Math.log(this.maxCitationCount + 1);
      size = 2.5 + citationFactor * 5;

      // Create more visually appealing colors based on year
      const yearNormalized = (node.year - this.minYear) / ((this.maxYear - this.minYear) || 1);

      // Color gradient from cool blue (older) to warm yellow-orange (newer)
      if (yearNormalized < 0.33) {
        color = new THREE.Color(0.2, 0.4, 0.8); // Blue for older papers
      } else if (yearNormalized < 0.66) {
        color = new THREE.Color(0.4, 0.7, 0.9); // Cyan for middle-era papers
      } else {
        color = new THREE.Color(0.9, 0.7, 0.3); // Yellow-orange for newer papers
      }
    } else {
      // Authors as purple-pink nebulae
      size = 4 + (node.paperCount || 1);
      color = new THREE.Color(0.8, 0.4, 1.0);
    }

    // Create a more detailed geometry for better visual quality
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: Math.random() * 100 }, // Random start time for variation
        u_brightness: { value: parseFloat(document.getElementById('node-brightness').value) },
        u_color: { value: color }
      },
      vertexShader: this.vertexShader,
      fragmentShader: isPaper ? this.paperFragmentShader : this.authorFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending // Add additive blending for more realistic glow
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Store node data on the mesh for interaction
    mesh.userData = {
      nodeId: node.id,
      nodeType: node.type
    };

    // Make the node always face the camera
    mesh.onBeforeRender = (renderer, scene, camera) => {
      mesh.lookAt(camera.position);
      mesh.material.uniforms.u_time.value += 0.01;
    };

    return mesh;
  }

  // Enhanced link visualization for cosmic appearance
  createCosmicLink(link) {
    const isPaperToPaper =
      this.getNodeById(link.source).type === "paper" &&
      this.getNodeById(link.target).type === "paper";

    const startColor = isPaperToPaper ?
      new THREE.Color(0xff8844) : // Citation links (orange)
      new THREE.Color(0x88aaff);  // Authorship links (blue)

    const endColor = isPaperToPaper ?
      new THREE.Color(0xffaa66) : // Slight variation for better visual effect
      new THREE.Color(0xaaccff);

    // Customize particle appearance based on relationship type
    const particles = {
      size: isPaperToPaper ? 1.8 : 1.5,
      color: startColor,
      endColor: endColor,
      speed: isPaperToPaper ? 0.03 : 0.04
    };

    return particles;
  }

  // Helper method to get node by ID
  getNodeById(nodeId) {
    const id = typeof nodeId === 'object' ? nodeId.id : nodeId;
    return this.graphData.nodes.find(node => node.id === id);
  }

  // Process raw JSON data into graph nodes and links
  processData(papers) {
    const nodes = [];
    const links = [];
    const authorsMap = new Map();

    this.maxCitationCount = 0;
    this.minYear = 3000;
    this.maxYear = 0;

    papers.forEach(paper => {
      if (paper.citationCount > this.maxCitationCount) this.maxCitationCount = paper.citationCount;
      if (paper.year < this.minYear) this.minYear = paper.year;
      if (paper.year > this.maxYear) this.maxYear = paper.year;

      // Add dataset field if available
      const datasets = paper.datasets || [];

      nodes.push({
        id: paper.paperId,
        title: paper.title,
        year: paper.year,
        abstract: paper.abstract,
        citationCount: paper.citationCount,
        referenceCount: paper.referenceCount,
        datasets: datasets,
        type: "paper"
      });

      // Process authors
      paper.authors.forEach(author => {
        if (!authorsMap.has(author.authorId)) {
          authorsMap.set(author.authorId, {
            id: author.authorId,
            name: author.name,
            type: "author",
            paperCount: 0,
            affiliations: author.affiliations || []
          });
        }
        const authorData = authorsMap.get(author.authorId);
        authorData.paperCount++;
        links.push({
          source: author.authorId,
          target: paper.paperId,
          relation: "AUTHORED",
          type: "authorship"
        });
      });

      // Add citation links if available
      if (paper.references && Array.isArray(paper.references)) {
        paper.references.forEach(ref => {
          links.push({
            source: paper.paperId,
            target: ref,
            relation: "CITES",
            type: "citation"
          });
        });
      }
    });

    authorsMap.forEach(author => nodes.push(author));
    this.updateControlRanges();

    return { nodes, links };
  }

  // Update slider ranges based on data
  updateControlRanges() {
    const yearMinSlider = document.getElementById('year-min');
    const yearMaxSlider = document.getElementById('year-max');
    const yearMinDisplay = document.getElementById('year-min-display');
    const yearMaxDisplay = document.getElementById('year-max-display');

    if (yearMinSlider && yearMaxSlider) {
      yearMinSlider.min = this.minYear;
      yearMinSlider.max = this.maxYear;
      yearMinSlider.value = this.minYear;

      yearMaxSlider.min = this.minYear;
      yearMaxSlider.max = this.maxYear;
      yearMaxSlider.value = this.maxYear;

      if (yearMinDisplay && yearMaxDisplay) {
        yearMinDisplay.textContent = this.minYear;
        yearMaxDisplay.textContent = this.maxYear;
      }
    }

    const citMinSlider = document.getElementById('citation-min');
    const citMaxSlider = document.getElementById('citation-max');
    const citMinDisplay = document.getElementById('citation-min-display');
    const citMaxDisplay = document.getElementById('citation-max-display');

    if (citMinSlider && citMaxSlider) {
      citMinSlider.max = this.maxCitationCount;
      citMaxSlider.max = this.maxCitationCount;
      citMaxSlider.value = this.maxCitationCount;

      if (citMinDisplay && citMaxDisplay) {
        citMinDisplay.textContent = "0";
        citMaxDisplay.textContent = this.maxCitationCount.toLocaleString() + "+";
      }
    }
  }

  // Apply filters to graphData and update the graph
  applyFilters() {
    const minYear = parseInt(document.getElementById('year-min').value);
    const maxYear = parseInt(document.getElementById('year-max').value);
    const minCitations = parseInt(document.getElementById('citation-min').value);
    const maxCitations = parseInt(document.getElementById('citation-max').value);
    const relationshipType = document.getElementById('relationship-type').value;

    // Get dataset filter value if it exists
    const datasetFilter = document.getElementById('dataset-filter') ?
      document.getElementById('dataset-filter').value.toLowerCase() : '';

    const filteredPaperNodes = this.graphData.nodes.filter(node => {
      if (node.type !== 'paper') return false;
      if (node.year < minYear || node.year > maxYear) return false;
      if (node.citationCount < minCitations || node.citationCount > maxCitations) return false;

      // Dataset filtering
      if (datasetFilter && node.datasets) {
        // Check if any dataset contains the filter text
        if (!node.datasets.some(dataset =>
          dataset.toLowerCase().includes(datasetFilter))) {
          return false;
        }
      }

      return true;
    });

    const filteredPaperIds = new Set(filteredPaperNodes.map(node => node.id));

    const filteredLinks = this.graphData.links.filter(link => {
      // Skip invalid links
      if (!link || !link.source || !link.target) return false;

      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;

      // Keep links that connect to at least one visible paper
      if (!filteredPaperIds.has(targetId) && !filteredPaperIds.has(sourceId)) return false;

      // Apply relationship type filter
      if (relationshipType !== 'all' && link.type !== relationshipType) return false;

      return true;
    });

    // Find all relevant author IDs that connect to visible papers
    const relevantAuthorIds = new Set();
    filteredLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (link.relation === 'AUTHORED') {
        const node = this.graphData.nodes.find(n => n.id === sourceId);
        if (node && node.type === 'author') {
          relevantAuthorIds.add(sourceId);
        }
      }
    });

    // Filter author nodes
    const filteredAuthorNodes = this.graphData.nodes.filter(node =>
      node.type === 'author' && relevantAuthorIds.has(node.id)
    );

    // Combine paper and author nodes
    const filteredNodes = [...filteredPaperNodes, ...filteredAuthorNodes];
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

    // Final link filtering to ensure both ends connect to visible nodes
    const finalLinks = filteredLinks.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    this.filteredData = {
      nodes: filteredNodes,
      links: finalLinks
    };

    // Update the ForceGraph data
    this.Graph.graphData(this.filteredData);

    // Update the legend to reflect current filter state
    this.updateLegend();
  }

  // Create or update the legend based on current filters
  updateLegend() {
    // Get or create the legend element
    let legend = document.getElementById('graph-legend');
    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'graph-legend';
      legend.className = 'graph-legend';
      document.body.appendChild(legend);
    }

    // Count papers by year range
    const yearCounts = {};
    const yearStep = Math.ceil((this.maxYear - this.minYear) / 4);

    for (let i = 0; i < 4; i++) {
      const startYear = this.minYear + i * yearStep;
      const endYear = i === 3 ? this.maxYear : this.minYear + (i + 1) * yearStep - 1;
      yearCounts[`${startYear}-${endYear}`] = 0;
    }

    // Count papers in current filtered data
    this.filteredData.nodes.forEach(node => {
      if (node.type === 'paper') {
        for (const yearRange in yearCounts) {
          const [startYear, endYear] = yearRange.split('-').map(Number);
          if (node.year >= startYear && node.year <= endYear) {
            yearCounts[yearRange]++;
            break;
          }
        }
      }
    });

    // Count author and paper nodes
    const paperCount = this.filteredData.nodes.filter(n => n.type === 'paper').length;
    const authorCount = this.filteredData.nodes.filter(n => n.type === 'author').length;

    // Generate legend content
    let legendHTML = `
      <div class="legend-header">Knowledge Graph Legend</div>
      <div class="legend-content">
        <div class="legend-section">
          <div class="legend-title">Nodes (${this.filteredData.nodes.length})</div>
          <div class="legend-item">
            <span class="legend-color" style="background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,150,255,0.7) 50%, rgba(0,50,150,0) 100%);"></span>
            <span class="legend-label">Papers: ${paperCount}</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,100,255,0.7) 50%, rgba(80,0,150,0) 100%);"></span>
            <span class="legend-label">Authors: ${authorCount}</span>
          </div>
        </div>
        <div class="legend-section">
          <div class="legend-title">Papers by Year</div>
    `;

    // Add year ranges to legend
    for (const yearRange in yearCounts) {
      const [startYear, endYear] = yearRange.split('-');
      const count = yearCounts[yearRange];

      // Select color based on year range (matching the node shader logic)
      let color;
      const rangePosition = (parseInt(startYear) - this.minYear) / (this.maxYear - this.minYear);

      if (rangePosition < 0.33) {
        color = "rgba(51, 102, 204, 0.8)";
      } else if (rangePosition < 0.66) {
        color = "rgba(102, 179, 230, 0.8)";
      } else {
        color = "rgba(230, 179, 76, 0.8)";
      }

      legendHTML += `
        <div class="legend-item">
          <span class="legend-color" style="background: radial-gradient(circle, rgba(255,255,255,1) 0%, ${color} 50%, rgba(0,0,0,0) 100%);"></span>
          <span class="legend-label">${startYear}-${endYear}: ${count}</span>
        </div>
      `;
    }

    // Add links to legend
    const citationCount = this.filteredData.links.filter(l => l.type === 'citation').length;
    const authorshipCount = this.filteredData.links.filter(l => l.type === 'authorship').length;

    legendHTML += `
        </div>
        <div class="legend-section">
          <div class="legend-title">Links (${this.filteredData.links.length})</div>
          <div class="legend-item">
            <span class="legend-line" style="background: linear-gradient(90deg, rgba(255,136,68,1) 0%, rgba(255,170,102,1) 100%);"></span>
            <span class="legend-label">Citations: ${citationCount}</span>
          </div>
          <div class="legend-item">
            <span class="legend-line" style="background: linear-gradient(90deg, rgba(136,170,255,1) 0%, rgba(170,204,255,1) 100%);"></span>
            <span class="legend-label">Authorship: ${authorshipCount}</span>
          </div>
        </div>
      </div>
    `;

    legend.innerHTML = legendHTML;
  }

  // Enhanced node info panel with better visualization
  showNodeInfo(node) {
    const infoPanel = document.getElementById('info-panel');
    const infoTitle = document.getElementById('info-title');

    // Store the selected node for camera focus
    this.selectedNode = node;

    if (node.type === 'paper') {
      // Format the paper publication year and citation count
      const yearFormatted = node.year;
      const citationsFormatted = node.citationCount.toLocaleString();

      infoTitle.textContent = node.title;

      // Create datasets section if available
      let datasetsHTML = '';
      if (node.datasets && node.datasets.length > 0) {
        datasetsHTML = `
          <div class="info-section">
            <h3>Datasets</h3>
            <div class="dataset-tags">
              ${node.datasets.map(dataset =>
          `<span class="dataset-tag">${dataset}</span>`).join('')}
            </div>
          </div>
        `;
      }

      document.getElementById('info-content').innerHTML = `
        <div class="info-metadata">
          <div class="info-stat">
            <div class="info-stat-value">${yearFormatted}</div>
            <div class="info-stat-label">Year</div>
          </div>
          <div class="info-stat">
            <div class="info-stat-value">${citationsFormatted}</div>
            <div class="info-stat-label">Citations</div>
          </div>
          <div class="info-stat">
            <div class="info-stat-value">${node.referenceCount}</div>
            <div class="info-stat-label">References</div>
          </div>
        </div>
        
        <div class="info-section">
          <h3>Abstract</h3>
          <div class="abstract-content">${node.abstract || 'No abstract available'}</div>
        </div>
        
        ${datasetsHTML}
        
        <div class="info-section">
          <h3>Authors</h3>
          <div class="authors-list" id="info-authors">Loading authors...</div>
        </div>
        
        <div class="action-buttons">
          <button id="focus-node-btn" class="action-button primary">Focus</button>
          <button id="expand-node-btn" class="action-button">Expand Network</button>
        </div>
      `;

      // Load authors
      const authorList = document.getElementById('info-authors');
      const authorLinks = this.graphData.links.filter(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return targetId === node.id && link.relation === 'AUTHORED';
      });

      if (authorLinks.length > 0) {
        const authorHtml = authorLinks.map(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const author = this.graphData.nodes.find(n => n.id === sourceId);
          if (!author) return '';

          const authorPaperCount = author.paperCount || 0;
          return `
            <div class="author-item" data-author-id="${author.id}">
              <span class="author-name">${author.name}</span>
              <span class="author-papers">${authorPaperCount} paper${authorPaperCount !== 1 ? 's' : ''}</span>
            </div>
          `;
        }).join('');

        authorList.innerHTML = authorHtml || 'No authors found';

        // Add click events to author names
        document.querySelectorAll('.author-item').forEach(item => {
          item.addEventListener('click', () => {
            const authorId = item.getAttribute('data-author-id');
            const authorNode = this.graphData.nodes.find(n => n.id === authorId);
            if (authorNode) {
              this.showNodeInfo(authorNode);
            }
          });
        });
      } else {
        authorList.innerHTML = 'No authors found';
      }

      // Set up action buttons
      document.getElementById('focus-node-btn').addEventListener('click', () => {
        this.focusOnNode(node);
      });

      document.getElementById('expand-node-btn').addEventListener('click', () => {
        this.expandNodeNetwork(node);
      });

      infoPanel.style.display = 'block';
    } else if (node.type === 'author') {
      // Author info panel
      infoTitle.textContent = node.name;

      // Get papers by this author
      const authoredPapers = this.graphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        return sourceId === node.id && link.relation === 'AUTHORED';
      });

      // Get co-authors
      const coauthors = new Map();
      authoredPapers.forEach(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const paper = this.graphData.nodes.find(n => n.id === targetId);
        if (!paper) return;

        // Find other authors of this paper
        const paperAuthors = this.graphData.links.filter(l => {
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          return tId === targetId && sId !== node.id && l.relation === 'AUTHORED';
        });

        paperAuthors.forEach(l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const author = this.graphData.nodes.find(n => n.id === sId);
          if (author) {
            if (!coauthors.has(author.id)) {
              coauthors.set(author.id, {
                author: author,
                count: 1
              });
            } else {
              coauthors.get(author.id).count++;
            }
          }
        });
      });

      // Sort papers by citation count
      const sortedPapers = authoredPapers
        .map(link => {
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return this.graphData.nodes.find(n => n.id === targetId);
        })
        .filter(paper => paper) // Remove nulls
        .sort((a, b) => b.citationCount - a.citationCount);

      // Generate affiliations HTML
      let affiliationsHTML = '';
      if (node.affiliations && node.affiliations.length > 0) {
        affiliationsHTML = `
          <div class="info-section">
            <h3>Affiliations</h3>
            <div class="affiliations-list">
              ${node.affiliations.map(aff => `<div>${aff}</div>`).join('')}
            </div>
          </div>
        `;
      }

      // Generate co-authors HTML
      let coauthorsHTML = '';
      if (coauthors.size > 0) {
        const coauthorsList = Array.from(coauthors.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 co-authors

        coauthorsHTML = `
          <div class="info-section">
            <h3>Top Co-authors</h3>
            <div class="coauthors-list">
              ${coauthorsList.map(item => `
                <div class="coauthor-item" data-author-id="${item.author.id}">
                  <span class="coauthor-name">${item.author.name}</span>
                  <span class="coauthor-count">${item.count} paper${item.count !== 1 ? 's' : ''} together</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      document.getElementById('info-content').innerHTML = `
        <div class="info-metadata">
          <div class="info-stat">
            <div class="info-stat-value">${node.paperCount || 0}</div>
            <div class="info-stat-label">Papers</div>
          </div>
          <div class="info-stat">
            <div class="info-stat-value">${coauthors.size}</div>
            <div class="info-stat-label">Co-authors</div>
          </div>
        </div>
        
        ${affiliationsHTML}
        ${coauthorsHTML}
        
        <div class="info-section">
          <h3>Papers (${sortedPapers.length})</h3>
          <div class="papers-list">
            ${sortedPapers.slice(0, 10).map(paper => `
              <div class="paper-item" data-paper-id="${paper.id}">
                <div class="paper-title">${paper.title}</div>
                <div class="paper-meta">
                  <span class="paper-year">${paper.year}</span>
                  <span class="paper-citations">${paper.citationCount} citation${paper.citationCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            `).join('')}
            ${sortedPapers.length > 10 ? `<div class="papers-more">+ ${sortedPapers.length - 10} more papers</div>` : ''}
          </div>
        </div>
        
        <div class="action-buttons">
          <button id="focus-node-btn" class="action-button primary">Focus</button>
          <button id="expand-node-btn" class="action-button">Show Collaboration Network</button>
        </div>
      `;

      // Add click events
      document.querySelectorAll('.paper-item').forEach(item => {
        item.addEventListener('click', () => {
          const paperId = item.getAttribute('data-paper-id');
          const paperNode = this.graphData.nodes.find(n => n.id === paperId);
          if (paperNode) {
            this.showNodeInfo(paperNode);
          }
        });
      });

      document.querySelectorAll('.coauthor-item').forEach(item => {
        item.addEventListener('click', () => {
          const authorId = item.getAttribute('data-author-id');
          const authorNode = this.graphData.nodes.find(n => n.id === authorId);
          if (authorNode) {
            this.showNodeInfo(authorNode);
          }
        });
      });

      document.getElementById('focus-node-btn').addEventListener('click', () => {
        this.focusOnNode(node);
      });

      document.getElementById('expand-node-btn').addEventListener('click', () => {
        this.expandAuthorNetwork(node);
      });

      infoPanel.style.display = 'block';
    }
  }

  // Smooth camera animation to focus on a node
  focusOnNode(node) {
    if (!node || !this.Graph) return;

    const distance = this.cameraDistance;
    const speed = this.cameraSpeed;

    // Get current camera position
    const currentPos = this.Graph.cameraPosition();

    // Get node position
    const nodePos = this.Graph.getGraphBbox();
    const targetPos = {
      x: node.x !== undefined ? node.x : (nodePos.x.max + nodePos.x.min) / 2,
      y: node.y !== undefined ? node.y : (nodePos.y.max + nodePos.y.min) / 2,
      z: node.z !== undefined ? node.z : (nodePos.z.max + nodePos.z.min) / 2
    };

    // Calculate target camera position
    let targetCameraPos;

    if (this.enableSmoothNavigation) {
      // If smooth navigation enabled, calculate camera position with offset
      const { canvas } = this.Graph.renderer();
      const canvasRect = canvas.getBoundingClientRect();

      // Target position is slightly offset to show node context
      targetCameraPos = {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z + distance
      };

      // Smoothly move camera
      this.animateCamera(currentPos, targetCameraPos, targetPos, speed);
    } else {
      // Instant focus
      this.Graph.cameraPosition(
        { x: targetPos.x, y: targetPos.y, z: targetPos.z + distance }, // new position
        targetPos, // lookAt
        3000 // transition duration in ms
      );
    }
  }

  // Enhanced smooth camera animation
  animateCamera(startPos, endPos, lookAtPos, speed = 0.05) {
    if (!this.Graph) return;

    const camera = this.Graph.camera();
    const renderer = this.Graph.renderer();
    const controls = this.Graph.controls();

    // Disable controls during animation
    if (controls) controls.enabled = false;

    // Current interpolation value
    let t = 0;

    // Animation function
    const animate = () => {
      if (t >= 1) {
        // Animation complete, re-enable controls
        if (controls) controls.enabled = true;
        return;
      }

      // Request next frame
      requestAnimationFrame(animate);

      // Update interpolation value with easing
      t += speed;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Smooth easing

      // Calculate new camera position
      const newPos = {
        x: startPos.x + (endPos.x - startPos.x) * ease,
        y: startPos.y + (endPos.y - startPos.y) * ease,
        z: startPos.z + (endPos.z - startPos.z) * ease
      };

      // Update camera position
      camera.position.set(newPos.x, newPos.y, newPos.z);
      camera.lookAt(lookAtPos.x, lookAtPos.y, lookAtPos.z);

      // Render the scene
      renderer.render(this.Graph.scene(), camera);
    };

    // Start animation
    animate();
  }

  // Implement expand network feature for paper nodes
  expandNodeNetwork(node) {
    if (!node || node.type !== 'paper') return;

    const relatedNodes = new Set();
    relatedNodes.add(node.id);

    // Get citation links
    this.graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (link.type === 'citation') {
        if (sourceId === node.id) {
          relatedNodes.add(targetId);
        } else if (targetId === node.id) {
          relatedNodes.add(sourceId);
        }
      }
    });

    // Get authors
    const authorLinks = this.graphData.links.filter(link => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return targetId === node.id && link.relation === 'AUTHORED';
    });

    authorLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      relatedNodes.add(sourceId);
    });

    // Filter nodes to show only the expanded network
    const nodeFilter = n => relatedNodes.has(n.id);

    // Filter links to show only connections in the expanded network
    const linkFilter = link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return relatedNodes.has(sourceId) && relatedNodes.has(targetId);
    };

    this.filteredData = {
      nodes: this.graphData.nodes.filter(nodeFilter),
      links: this.graphData.links.filter(linkFilter)
    };

    // Update the graph
    this.Graph.graphData(this.filteredData);
    this.updateLegend();

    // Add a "reset filters" button
    this.showResetFiltersButton();
  }

  // Implement collaboration network expansion for author nodes
  expandAuthorNetwork(node) {
    if (!node || node.type !== 'author') return;

    const relatedNodes = new Set();
    relatedNodes.add(node.id);

    // Get author's papers
    const authoredPaperIds = new Set();
    this.graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (link.relation === 'AUTHORED' && sourceId === node.id) {
        authoredPaperIds.add(targetId);
        relatedNodes.add(targetId);
      }
    });

    // Get co-authors
    this.graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      if (link.relation === 'AUTHORED' && authoredPaperIds.has(targetId)) {
        relatedNodes.add(sourceId);
      }
    });

    // Filter nodes to show only the collaboration network
    const nodeFilter = n => relatedNodes.has(n.id);

    // Filter links to show only connections in the collaboration network
    const linkFilter = link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return relatedNodes.has(sourceId) && relatedNodes.has(targetId);
    };

    this.filteredData = {
      nodes: this.graphData.nodes.filter(nodeFilter),
      links: this.graphData.links.filter(linkFilter)
    };

    // Update the graph
    this.Graph.graphData(this.filteredData);
    this.updateLegend();

    // Add a "reset filters" button
    this.showResetFiltersButton();
  }

  // Show a floating reset button when filters are applied
  showResetFiltersButton() {
    let resetBtn = document.getElementById('reset-filters-btn');

    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.id = 'reset-filters-btn';
      resetBtn.className = 'floating-button';
      resetBtn.innerHTML = '<span>Reset Filters</span>';
      document.body.appendChild(resetBtn);

      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    resetBtn.style.display = 'flex';
  }

  // Reset filters and show the full graph
  resetFilters() {
    // Reset all filter UI controls to default values
    const yearMinSlider = document.getElementById('year-min');
    const yearMaxSlider = document.getElementById('year-max');
    const citMinSlider = document.getElementById('citation-min');
    const citMaxSlider = document.getElementById('citation-max');
    const relationshipType = document.getElementById('relationship-type');
    const datasetFilter = document.getElementById('dataset-filter');

    if (yearMinSlider && yearMaxSlider) {
      yearMinSlider.value = this.minYear;
      yearMaxSlider.value = this.maxYear;
      document.getElementById('year-min-display').textContent = this.minYear;
      document.getElementById('year-max-display').textContent = this.maxYear;
    }

    if (citMinSlider && citMaxSlider) {
      citMinSlider.value = 0;
      citMaxSlider.value = this.maxCitationCount;
      document.getElementById('citation-min-display').textContent = "0";
      document.getElementById('citation-max-display').textContent = this.maxCitationCount.toLocaleString() + "+";
    }

    if (relationshipType) {
      relationshipType.value = 'all';
    }

    if (datasetFilter) {
      datasetFilter.value = '';
    }

    // Apply the reset filters
    this.applyFilters();

    // Hide the reset button
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.style.display = 'none';
    }
  }

  // Create an advanced search interface
  createSearchInterface() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
      <div class="search-wrapper">
        <input type="text" id="search-input" class="search-input" placeholder="Search papers, authors, or keywords...">
        <div class="search-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <div class="search-dropdown">
          <div class="search-type">
            <label>
              <input type="radio" name="search-type" value="all" checked> All
            </label>
            <label>
              <input type="radio" name="search-type" value="papers"> Papers
            </label>
            <label>
              <input type="radio" name="search-type" value="authors"> Authors
            </label>
            <label>
              <input type="radio" name="search-type" value="datasets"> Datasets
            </label>
          </div>
        </div>
      </div>
      <div class="search-results" id="search-results"></div>
    `;

    document.body.appendChild(searchContainer);

    // Add event listeners
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', () => {
      this.performSearch(searchInput.value);
    });

    searchInput.addEventListener('focus', () => {
      searchResults.style.display = 'block';
    });

    // Allow clicking outside to close search results
    document.addEventListener('click', (event) => {
      if (!searchContainer.contains(event.target)) {
        searchResults.style.display = 'none';
      }
    });

    // Prevent clicks within the search results from closing it
    searchResults.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }

  // Perform search across nodes
  performSearch(query) {
    if (!query || query.length < 2) {
      document.getElementById('search-results').innerHTML = '';
      return;
    }

    query = query.toLowerCase();
    const searchType = document.querySelector('input[name="search-type"]:checked').value;

    // Determine which nodes to search based on type
    let results = [];

    if (searchType === 'all' || searchType === 'papers') {
      const paperResults = this.graphData.nodes
        .filter(node =>
          node.type === 'paper' &&
          (node.title.toLowerCase().includes(query) ||
            (node.abstract && node.abstract.toLowerCase().includes(query))))
        .slice(0, 10);

      results = results.concat(paperResults);
    }

    if (searchType === 'all' || searchType === 'authors') {
      const authorResults = this.graphData.nodes
        .filter(node =>
          node.type === 'author' &&
          node.name.toLowerCase().includes(query))
        .slice(0, 10);

      results = results.concat(authorResults);
    }

    if (searchType === 'all' || searchType === 'datasets') {
      const datasetResults = this.graphData.nodes
        .filter(node =>
          node.type === 'paper' &&
          node.datasets &&
          node.datasets.some(dataset =>
            dataset.toLowerCase().includes(query)))
        .slice(0, 10);

      results = results.concat(datasetResults);
    }

    // Sort results by relevance
    results.sort((a, b) => {
      // Exact matches first
      const aExact = a.type === 'paper'
        ? a.title.toLowerCase() === query
        : a.name.toLowerCase() === query;
      const bExact = b.type === 'paper'
        ? b.title.toLowerCase() === query
        : b.name.toLowerCase() === query;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by relevance (starts with query)
      const aStarts = a.type === 'paper'
        ? a.title.toLowerCase().startsWith(query)
        : a.name.toLowerCase().startsWith(query);
      const bStarts = b.type === 'paper'
        ? b.title.toLowerCase().startsWith(query)
        : b.name.toLowerCase().startsWith(query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Then citations/papers count
      if (a.type === 'paper' && b.type === 'paper') {
        return b.citationCount - a.citationCount;
      } else if (a.type === 'author' && b.type === 'author') {
        return (b.paperCount || 0) - (a.paperCount || 0);
      }

      // Papers before authors
      return a.type === 'paper' ? -1 : 1;
    });

    // Limit results
    results = results.slice(0, 10);

    this.displaySearchResults(results);
  }

  // Display search results in a dropdown
  displaySearchResults(results) {
    const searchResults = document.getElementById('search-results');

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    let resultsHTML = '<div class="results-list">';

    results.forEach(result => {
      if (result.type === 'paper') {
        let datasetHighlight = '';

        // Check if search was for dataset
        if (document.querySelector('input[name="search-type"]:checked').value === 'datasets') {
          const query = document.getElementById('search-input').value.toLowerCase();

          if (result.datasets) {
            const matchingDatasets = result.datasets.filter(d =>
              d.toLowerCase().includes(query)
            );

            if (matchingDatasets.length > 0) {
              datasetHighlight = `
                <div class="result-datasets">
                  Datasets: ${matchingDatasets.map(d => `<span class="result-dataset">${d}</span>`).join(', ')}
                </div>
              `;
            }
          }
        }

        resultsHTML += `
          <div class="result-item paper" data-id="${result.id}">
            <div class="result-icon paper-icon"></div>
            <div class="result-content">
              <div class="result-title">${result.title}</div>
              <div class="result-meta">
                <span class="result-year">${result.year}</span>
                <span class="result-citations">${result.citationCount} citations</span>
              </div>
              ${datasetHighlight}
            </div>
          </div>
        `;
      } else if (result.type === 'author') {
        resultsHTML += `
          <div class="result-item author" data-id="${result.id}">
            <div class="result-icon author-icon"></div>
            <div class="result-content">
              <div class="result-title">${result.name}</div>
              <div class="result-meta">
                <span class="result-papers">${result.paperCount || 0} papers</span>
              </div>
            </div>
          </div>
        `;
      }
    });

    resultsHTML += '</div>';
    searchResults.innerHTML = resultsHTML;

    // Add click listeners
    document.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => {
        const nodeId = item.getAttribute('data-id');
        const node = this.graphData.nodes.find(n => n.id === nodeId);

        if (node) {
          // Show node info
          this.showNodeInfo(node);

          // Focus camera on node
          this.focusOnNode(node);

          // Highlight the node
          this.highlightNode(node);

          // Clear search results
          document.getElementById('search-results').style.display = 'none';
        }
      });
    });
  }

  // Highlight a node visually
  highlightNode(node) {
    if (!this.Graph) return;

    // Reset any previous highlights
    this.resetHighlights();

    // Get the node's mesh from the 3D scene
    const nodeMesh = this.Graph.nodeThreeObject()(node);

    if (nodeMesh) {
      // Create a pulsing highlight effect
      const highlight = new THREE.Mesh(
        new THREE.RingGeometry(node.type === 'paper' ? 4 : 6, node.type === 'paper' ? 6 : 8, 32),
        new THREE.MeshBasicMaterial({
          color: node.type === 'paper' ? 0x44aaff : 0xff44aa,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );

      // Position and attach highlight
      highlight.position.copy(nodeMesh.position);
      highlight.lookAt(this.Graph.camera().position);
      highlight.userData.isHighlight = true;

      // Add to scene
      this.Graph.scene().add(highlight);

      // Create pulse animation
      const animate = () => {
        if (!highlight.parent) return; // Stop if removed

        // Pulse size
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * 2) * 0.2 + 1;
        highlight.scale.set(pulse, pulse, pulse);

        // Always face camera
        highlight.lookAt(this.Graph.camera().position);

        requestAnimationFrame(animate);
      };

      // Start animation
      animate();

      // Store for cleanup
      this.currentHighlight = highlight;
    }
  }

  // Reset node highlights
  resetHighlights() {
    if (this.currentHighlight) {
      this.Graph.scene().remove(this.currentHighlight);
      this.currentHighlight = null;
    }
  }

  // Enhanced particle system for links
  createParticleLinks() {
    if (!this.Graph) return;

    // Create a particle system for each link
    this.filteredData.links.forEach(link => {
      const sourceNode = this.getNodeById(link.source);
      const targetNode = this.getNodeById(link.target);

      if (!sourceNode || !targetNode) return;

      // Get particle properties based on link type
      const particles = this.createCosmicLink(link);

      // Create particle geometry
      const particleCount = 20;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      const particleColors = new Float32Array(particleCount * 3);

      // Create shader material
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_size: { value: particles.size },
          pointTexture: {
            value: new THREE.TextureLoader().load('assets/particle.png')
          }
        },
        vertexShader: `
          uniform float u_time;
          uniform float u_size;
          attribute float size;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * u_size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          
          void main() {
            gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
          }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
      });

      // Initialize particles along the link
      for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;

        // Position along the link
        particlePositions[i * 3] = sourceNode.x + (targetNode.x - sourceNode.x) * t;
        particlePositions[i * 3 + 1] = sourceNode.y + (targetNode.y - sourceNode.y) * t;
        particlePositions[i * 3 + 2] = sourceNode.z + (targetNode.z - sourceNode.z) * t;

        // Size variation
        particleSizes[i] = 0.5 + Math.random() * 0.5;

        // Color gradient
        const color = new THREE.Color().copy(particles.color).lerp(particles.endColor, t);
        particleColors[i * 3] = color.r;
        particleColors[i * 3 + 1] = color.g;
        particleColors[i * 3 + 2] = color.b;
      }

      // Set geometry attributes
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

      // Create points system
      const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
      particleSystem.userData = {
        sourceId: typeof link.source === 'object' ? link.source.id : link.source,
        targetId: typeof link.target === 'object' ? link.target.id : link.target,
        linkType: link.type,
        speed: particles.speed,
        time: Math.random() * 100
      };

      // Add to scene
      this.Graph.scene().add(particleSystem);

      // Store for updates
      if (!this.particleSystems) this.particleSystems = [];
      this.particleSystems.push(particleSystem);
    });

    // Start particle animation
    this.animateParticles();
  }

  // Animate particles flowing along links
  animateParticles() {
    if (!this.particleSystems || this.particleSystems.length === 0) return;

    const animate = () => {
      requestAnimationFrame(animate);

      this.particleSystems.forEach(system => {
        if (!system.parent) return; // Skip if removed

        // Get source and target nodes
        const sourceNode = this.getNodeById(system.userData.sourceId);
        const targetNode = this.getNodeById(system.userData.targetId);

        if (!sourceNode || !targetNode) return;

        // Update positions based on node movement
        const positions = system.geometry.attributes.position.array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          const t = i / count;

          // Static position along the line
          const staticX = sourceNode.x + (targetNode.x - sourceNode.x) * t;
          const staticY = sourceNode.y + (targetNode.y - sourceNode.y) * t;
          const staticZ = sourceNode.z + (targetNode.z - sourceNode.z) * t;

          // Flow effect - particles move along the link
          system.userData.time += system.userData.speed;
          const flowOffset = (t + (system.userData.time * 0.05) % 1) % 1;

          // Linear interpolation with flow effect
          positions[i * 3] = sourceNode.x + (targetNode.x - sourceNode.x) * flowOffset;
          positions[i * 3 + 1] = sourceNode.y + (targetNode.y - sourceNode.y) * flowOffset;
          positions[i * 3 + 2] = sourceNode.z + (targetNode.z - sourceNode.z) * flowOffset;
        }

        // Update material uniforms
        system.material.uniforms.u_time.value += 0.01;

        // Mark attributes for update
        system.geometry.attributes.position.needsUpdate = true;
      });
    };

    animate();
  }

  // Clean up particle systems
  cleanupParticles() {
    if (this.particleSystems) {
      this.particleSystems.forEach(system => {
        if (system.parent) {
          system.parent.remove(system);
        }

        if (system.geometry) {
          system.geometry.dispose();
        }

        if (system.material) {
          system.material.dispose();
        }
      });

      this.particleSystems = [];
    }
  }

  // Optimize graph for smoother performance
  optimizeGraphPerformance() {
    if (!this.Graph) return;

    // Implement level-of-detail rendering
    this.Graph.nodeRelSize(4); // Base node size

    // Implement dynamic resolution scaling based on performance
    const fpsThreshold = 30;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 60;

    // Monitor FPS and adjust rendering quality
    const monitorPerformance = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastFrameTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFrameTime = now;

        // Adjust quality based on performance
        if (currentFps < fpsThreshold) {
          // Reduce quality
          this.Graph.nodeResolution(8); // Lower node polygon count
          this.Graph.cooldownTime(10000); // Increase physics cooldown
          this.Graph.onEngineStop(() => this.Graph.renderer().setPixelRatio(1));
        } else {
          // Restore quality
          this.Graph.nodeResolution(16);
          this.Graph.cooldownTime(15000);
          this.Graph.onEngineStop(() => this.Graph.renderer().setPixelRatio(window.devicePixelRatio));
        }
      }

      requestAnimationFrame(monitorPerformance);
    };

    monitorPerformance();

    // Use occlusion culling to skip rendering nodes outside viewport
    const renderer = this.Graph.renderer();
    renderer.sortObjects = true;

    // Implement frustum culling to skip rendering out-of-view objects
    this.Graph.onBeforeRender(() => {
      const frustum = new THREE.Frustum();
      const camera = this.Graph.camera();

      frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        )
      );

      // Skip rendering nodes outside frustum
      this.filteredData.nodes.forEach(node => {
        const nodeObj = this.Graph.nodeThreeObject()(node);
        if (nodeObj && !frustum.containsPoint(new THREE.Vector3(node.x, node.y, node.z))) {
          nodeObj.visible = false;
        } else if (nodeObj) {
          nodeObj.visible = true;
        }
      });
    });
  }
  
  // Create a modern, sleek UI design for controls
  createModernUI() {
    // Remove any existing UI
    const existingUI = document.getElementById('graph-controls');
    if (existingUI) existingUI.remove();

    // Create main control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'graph-controls';
    controlPanel.className = 'modern-panel';

    // Header with logo and title
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <div class="app-title">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12,10.5A1.5,1.5 0 0,1 13.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,12A1.5,1.5 0 0,1 12,10.5M12,6.5A1.5,1.5 0 0,1 13.5,8A1.5,1.5 0 0,1 12,9.5A1.5,1.5 0 0,1 10.5,8A1.5,1.5 0 0,1 12,6.5M12,14.5A1.5,1.5 0 0,1 13.5,16A1.5,1.5 0 0,1 12,17.5A1.5,1.5 0 0,1 10.5,16A1.5,1.5 0 0,1 12,14.5M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z" />
        </svg>
        <h2>ML Paper Explorer</h2>
      </div>
      <button class="panel-toggle" id="toggle-panel">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
        </svg>
      </button>
    `;

    // Main content container with tabs
    const content = document.createElement('div');
    content.className = 'panel-content';

    // Create tabs system
    content.innerHTML = `
      <div class="tab-navigation">
        <button class="tab-button active" data-tab="explore">Explore</button>
        <button class="tab-button" data-tab="filter">Filter</button>
        <button class="tab-button" data-tab="visual">Visuals</button>
        <button class="tab-button" data-tab="info">Info</button>
      </div>
      
      <div class="tab-content">
        <!-- Explore Tab -->
        <div class="tab-pane active" id="explore-tab">
          <div class="search-container">
            <div class="search-input-wrapper">
              <input type="text" id="advanced-search" placeholder="Search papers, authors, datasets...">
              <button class="search-button">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button id="show-trending">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
                </svg>
                Trending Papers
              </button>
              <button id="show-influential">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2M12,5.5L10.04,9.55L5.92,10.17L8.96,13.11L8.24,17.18L12,15.31L15.77,17.18L15.04,13.11L18.08,10.17L13.96,9.55L12,5.5Z" />
                </svg>
                Top Authors
              </button>
              <button id="show-datasets">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12,3C7.58,3 4,4.79 4,7V17C4,19.21 7.59,21 12,21C16.41,21 20,19.21 20,17V7C20,4.79 16.42,3 12,3M12,5C15.87,5 18,6.5 18,7C18,7.5 15.87,9 12,9C8.13,9 6,7.5 6,7C6,6.5 8.13,5 12,5M18,15.5C18,16 15.87,17.5 12,17.5C8.13,17.5 6,16 6,15.5V12.7C7.66,13.53 9.87,14 12,14C14.13,14 16.34,13.53 18,12.7V15.5M18,10.83C16.34,11.67 14.13,12.14 12,12.14C9.87,12.14 7.66,11.67 6,10.83V8.83C7.66,9.67 9.87,10.14 12,10.14C14.13,10.14 16.34,9.67 18,8.83V10.83Z" />
                </svg>
                Popular Datasets
              </button>
            </div>
          </div>
          
          <div class="exploration-modes">
            <h3>Exploration Modes</h3>
            <div class="mode-selector">
              <div class="mode-option" id="citation-network">
                <div class="mode-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,12V14H19V12H5M5,16V18H14V16H5Z" />
                  </svg>
                </div>
                <div class="mode-label">Citation Network</div>
              </div>
              <div class="mode-option" id="author-collab">
                <div class="mode-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M12,5A3.5,3.5 0 0,0 8.5,8.5A3.5,3.5 0 0,0 12,12A3.5,3.5 0 0,0 15.5,8.5A3.5,3.5 0 0,0 12,5M12,7A1.5,1.5 0 0,1 13.5,8.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 10.5,8.5A1.5,1.5 0 0,1 12,7M5.5,8A2.5,2.5 0 0,0 3,10.5C3,11.44 3.53,12.25 4.29,12.68C4.65,12.88 5.06,13 5.5,13C5.94,13 6.35,12.88 6.71,12.68C7.08,12.47 7.39,12.17 7.62,11.81C6.89,10.86 6.5,9.7 6.5,8.5C6.5,8.41 6.5,8.31 6.5,8.22C6.2,8.08 5.86,8 5.5,8M18.5,8C18.14,8 17.8,8.08 17.5,8.22C17.5,8.31 17.5,8.41 17.5,8.5C17.5,9.7 17.11,10.86 16.38,11.81C16.5,12 16.63,12.15 16.78,12.3C16.94,12.45 17.1,12.58 17.29,12.68C17.65,12.88 18.06,13 18.5,13C18.94,13 19.35,12.88 19.71,12.68C20.47,12.25 21,11.44 21,10.5A2.5,2.5 0 0,0 18.5,8M12,14C9.66,14 5,15.17 5,17.5V19H19V17.5C19,15.17 14.34,14 12,14M4.71,14.55C2.78,14.78 0,15.76 0,17.5V19H3V17.07C3,16.06 3.69,15.22 4.71,14.55M19.29,14.55C20.31,15.22 21,16.06 21,17.07V19H24V17.5C24,15.76 21.22,14.78 19.29,14.55M12,16C13.53,16 15.24,16.5 16.23,17H7.77C8.76,16.5 10.47,16 12,16Z" />
                  </svg>
                </div>
                <div class="mode-label">Author Collaborations</div>
              </div>
              <div class="mode-option" id="dataset-focus">
                <div class="mode-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M15,19L12,22L9,19H15M20,2H4C2.9,2 2,2.9 2,4V18C2,19.1 2.9,20 4,20H20C21.1,20 22,19.1 22,18V4C22,2.9 21.1,2 20,2M20,18H4V4H20V18M14,14L14,14.5H10V14C10,12.34 13,12.34 13,11C13,10.45 12.55,10 12,10C11.45,10 11,10.45 11,11H9C9,9.34 10.34,8 12,8C13.66,8 15,9.34 15,11C15,12.34 12,12.34 12,14L14,14Z" />
                  </svg>
                </div>
                <div class="mode-label">Dataset Explorer</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Filter Tab -->
        <div class="tab-pane" id="filter-tab">
          <div class="filter-group">
            <h3>Publication Year</h3>
            <div class="range-slider">
              <div class="range-values">
                <span id="year-min-display">${this.minYear}</span>
                <span id="year-max-display">${this.maxYear}</span>
              </div>
              <div class="dual-slider">
                <input type="range" id="year-min" min="${this.minYear}" max="${this.maxYear}" value="${this.minYear}" class="range-input">
                <input type="range" id="year-max" min="${this.minYear}" max="${this.maxYear}" value="${this.maxYear}" class="range-input">
                <div class="slider-track"></div>
              </div>
            </div>
          </div>
          
          <div class="filter-group">
            <h3>Citation Count</h3>
            <div class="range-slider">
              <div class="range-values">
                <span id="citation-min-display">0</span>
                <span id="citation-max-display">${this.maxCitationCount}+</span>
              </div>
              <div class="dual-slider">
                <input type="range" id="citation-min" min="0" max="${this.maxCitationCount}" value="0" class="range-input">
                <input type="range" id="citation-max" min="0" max="${this.maxCitationCount}" value="${this.maxCitationCount}" class="range-input">
                <div class="slider-track"></div>
              </div>
            </div>
          </div>
          
          <div class="filter-group">
            <h3>Relationship Type</h3>
            <select id="relationship-type" class="modern-select">
              <option value="all">All Relationships</option>
              <option value="citation">Citations Only</option>
              <option value="authorship">Authorship Only</option>
              <option value="dataset">Dataset Usage</option>
            </select>
          </div>
          
          <div class="filter-group">
            <h3>Datasets</h3>
            <select id="dataset-filter" class="modern-select">
              <option value="">All Datasets</option>
              <!-- Dynamically populated -->
            </select>
          </div>
          
          <button id="apply-filters" class="primary-button">
            Apply Filters
          </button>
          
          <button id="reset-filters" class="secondary-button">
            Reset Filters
          </button>
        </div>
        
        <!-- Visuals Tab -->
        <div class="tab-pane" id="visual-tab">
          <div class="slider-control">
            <label for="node-brightness">Node Brightness</label>
            <input type="range" id="node-brightness" min="0.5" max="2" step="0.1" value="1" class="range-input">
          </div>
          
          <div class="slider-control">
            <label for="link-visibility">Link Visibility</label>
            <input type="range" id="link-visibility" min="0.1" max="1" step="0.1" value="0.7" class="range-input">
          </div>
          
          <div class="slider-control">
            <label for="background-darkness">Background Darkness</label>
            <input type="range" id="background-darkness" min="0" max="1" step="0.1" value="0.95" class="range-input">
          </div>
          
          <div class="toggle-control">
            <label for="enable-bloom">Bloom Effect</label>
            <label class="switch">
              <input type="checkbox" id="enable-bloom" checked>
              <span class="slider round"></span>
            </label>
          </div>
          
          <div class="toggle-control">
            <label for="enable-particles">Particle Effects</label>
            <label class="switch">
              <input type="checkbox" id="enable-particles" checked>
              <span class="slider round"></span>
            </label>
          </div>
          
          <div class="toggle-control">
            <label for="enable-labels">Node Labels</label>
            <label class="switch">
              <input type="checkbox" id="enable-labels">
              <span class="slider round"></span>
            </label>
          </div>
          
          <div class="color-theme">
            <h3>Color Theme</h3>
            <div class="theme-options">
              <div class="theme-option selected" data-theme="cosmic">
                <div class="theme-preview cosmic"></div>
                <span>Cosmic</span>
              </div>
              <div class="theme-option" data-theme="neon">
                <div class="theme-preview neon"></div>
                <span>Neon</span>
              </div>
              <div class="theme-option" data-theme="pastel">
                <div class="theme-preview pastel"></div>
                <span>Pastel</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Info Tab -->
        <div class="tab-pane" id="info-tab">
          <div id="node-info-panel">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" width="48" height="48">
                <path fill="currentColor" d="M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z" />
              </svg>
              <p>Select a node to view details</p>
            </div>
            <!-- Node details dynamically populated -->
          </div>
        </div>
      </div>
    `;

    controlPanel.appendChild(header);
    controlPanel.appendChild(content);
    document.body.appendChild(controlPanel);

    // Add CSS for the modern UI
    this.addModernStyles();

    // Initialize UI interactions
    this.initializeUIInteractions();

    // Make panel collapsible
    document.getElementById('toggle-panel').addEventListener('click', () => {
      controlPanel.classList.toggle('collapsed');
    });
  }

  // Add custom CSS styles for modern UI
  addModernStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      :root {
        --primary-color: #6366f1;
        --primary-light: #818cf8;
        --primary-dark: #4f46e5;
        --text-color: #f8fafc;
        --text-secondary: #cbd5e1;
        --bg-dark: #0f172a;
        --bg-panel: rgba(30, 41, 59, 0.8);
        --bg-input: rgba(15, 23, 42, 0.6);
        --border-color: rgba(148, 163, 184, 0.2);
        --success-color: #10b981;
        --warning-color: #f59e0b;
        --error-color: #ef4444;
        --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        --panel-width: 360px;
      }
      
      @supports (backdrop-filter: blur(10px)) {
        .modern-panel, .search-results, .node-tooltip, .floating-button {
          backdrop-filter: blur(10px);
        }
      }
      
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        font-family: var(--font-sans);
        color: var(--text-color);
      }
      
      /* Modern Panel */
      .modern-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: var(--panel-width);
        background: var(--bg-panel);
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        transition: transform 0.3s ease, opacity 0.3s ease, width 0.3s ease;
        max-height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
      }
      
      .modern-panel.collapsed {
        width: 60px;
        transform: translateX(calc(var(--panel-width) - 60px));
      }
      
      .modern-panel.collapsed .panel-content {
        display: none;
      }
      
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 20px;
        border-bottom: 1px solid var(--border-color);
      }
      
      .app-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-color);
      }
      
      .app-title h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .panel-toggle {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: background-color 0.2s;
      }
      
      .panel-toggle:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }
      
      /* Tabs */
      .tab-navigation {
        display: flex;
        border-bottom: 1px solid var(--border-color);
      }
      
      .tab-button {
        flex: 1;
        background: none;
        border: none;
        padding: 10px 15px;
        color: var(--text-secondary);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        position: relative;
      }
      
      .tab-button.active {
        color: var(--primary-light);
      }
      
      .tab-button.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 25%;
        width: 50%;
        height: 2px;
        background-color: var(--primary-light);
        border-radius: 2px;
      }
      
      .tab-pane {
        display: none;
        padding: 20px;
      }
      
      .tab-pane.active {
        display: block;
      }
      
      /* Controls */
      .filter-group, .slider-control {
        margin-bottom: 20px;
      }
      
      .filter-group h3, .slider-control label {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      
      .modern-select {
        width: 100%;
        padding: 10px 12px;
        background-color: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 14px;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 16px;
        transition: border-color 0.2s;
      }
      
      .modern-select:focus {
        border-color: var(--primary-color);
        outline: none;
      }
      
      .range-slider {
        width: 100%;
      }
      
      .range-values {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        color: var(--text-secondary);
        font-size: 13px;
      }
      
      .dual-slider {
        position: relative;
        height: 20px;
      }
      
      .range-input {
        position: absolute;
        width: 100%;
        height: 5px;
        background: none;
        -webkit-appearance: none;
        pointer-events: none;
        outline: none;
      }
      
      .range-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background-color: var(--primary-color);
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        border: 2px solid var(--bg-dark);
      }
      
      .slider-track {
        position: absolute;
        top: 7px;
        width: 100%;
        height: 5px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
      }
      
      .primary-button, .secondary-button {
        width: 100%;
        padding: 12px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 10px;
      }
      
      .primary-button {
        background-color: var(--primary-color);
        color: white;
      }
      
      .primary-button:hover {
        background-color: var(--primary-dark);
      }
      
      .secondary-button {
        background-color: transparent;
        color: var(--text-color);
        border: 1px solid var(--border-color);
      }
      
      .secondary-button:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      /* Search bar */
      .search-container {
        margin-bottom: 20px;
      }

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      #advanced-search {
        width: 100%;
        padding: 10px 40px 10px 12px;
        background-color: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 14px;
      }

      #advanced-search:focus {
        border-color: var(--primary-color);
        outline: none;
      }

      .search-button {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        color: var(--text-secondary);
        padding: 5px;
        cursor: pointer;
      }

      /* Quick Actions */
      .quick-actions {
        margin-bottom: 20px;
      }

      .action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .action-buttons button {
        flex: 1;
        min-width: 120px;
        padding: 8px 12px;
        background-color: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-color);
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
      }

      .action-buttons button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      /* Exploration Modes */
      .exploration-modes {
        margin-bottom: 20px;
      }

      .mode-selector {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .mode-option {
        flex: 1;
        background-color: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 15px 10px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }

      .mode-option:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .mode-option.active {
        border-color: var(--primary-color);
        background-color: rgba(99, 102, 241, 0.1);
      }

      .mode-icon {
        margin-bottom: 8px;
      }

      .mode-label {
        font-size: 13px;
        font-weight: 500;
      }

      /* Toggle switch */
      .toggle-control {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 22px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-input);
        transition: .3s;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: var(--text-secondary);
        transition: .3s;
      }

      input:checked + .slider {
        background-color: var(--primary-color);
      }

      input:checked + .slider:before {
        transform: translateX(18px);
        background-color: white;
      }

      .slider.round {
        border-radius: 22px;
      }

      .slider.round:before {
        border-radius: 50%;
      }

      /* Color themes */
      .theme-options {
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }

      .theme-option {
        flex: 1;
        text-align: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid transparent;
        transition: all 0.2s;
      }

      .theme-option.selected {
        border-color: var(--primary-color);
        background-color: rgba(99, 102, 241, 0.1);
      }

      .theme-preview {
        height: 30px;
        border-radius: 5px;
        margin-bottom: 5px;
      }

      .theme-preview.cosmic {
        background: linear-gradient(to right, #4f46e5, #8b5cf6, #ec4899);
      }

      .theme-preview.neon {
        background: linear-gradient(to right, #00ff87, #60efff, #0061ff);
      }

      .theme-preview.pastel {
        background: linear-gradient(to right, #fb7185, #e879f9, #60a5fa);
      }

      .theme-option span {
        font-size: 12px;
      }

      /* Node info panel */
      #node-info-panel {
        min-height: 200px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        height: 200px;
      }

      .empty-state svg {
        opacity: 0.5;
        margin-bottom: 15px;
      }

      .node-info-header {
        margin-bottom: 15px;
      }

      .node-info-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .node-type-badge {
        display: inline-block;
        padding: 3px 10px;
        font-size: 12px;
        border-radius: 12px;
        margin-top: 5px;
      }

      .node-type-badge.paper {
        background-color: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
      }

      .node-type-badge.author {
        background-color: rgba(16, 185, 129, 0.2);
        color: #6ee7b7;
      }

      .node-type-badge.dataset {
        background-color: rgba(245, 158, 11, 0.2);
        color: #fcd34d;
      }

      .node-info-content {
        font-size: 14px;
      }

      .info-row {
        margin-bottom: 10px;
      }

      .info-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 3px;
      }

      .info-value {
        line-height: 1.4;
      }

      .info-value a {
        color: var(--primary-light);
        text-decoration: none;
      }

      .info-value a:hover {
        text-decoration: underline;
      }

      .abstract-container {
        margin-top: 15px;
        font-size: 13px;
        line-height: 1.5;
        max-height: 150px;
        overflow-y: auto;
      }

      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: var(--bg-input);
        border-radius: 6px;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 6px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Node tooltips */
      .node-tooltip {
        position: absolute;
        background: var(--bg-panel);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 220px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        border: 1px solid var(--border-color);
      }

      .node-tooltip h4 {
        margin: 0 0 5px 0;
        font-size: 13px;
      }

      .node-tooltip p {
        margin: 0;
        opacity: 0.8;
      }

      /* Floating button */
      .floating-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 100;
        transition: transform 0.2s, background-color 0.2s;
      }

      .floating-button:hover {
        transform: scale(1.05);
        background-color: var(--primary-dark);
      }

      /* Responsive styles */
      @media (max-width: 768px) {
        .modern-panel {
          width: calc(100% - 40px);
          top: 10px;
          right: 10px;
          max-height: calc(100vh - 20px);
        }

        .mode-option {
          padding: 10px 5px;
        }

        .mode-selector {
          flex-direction: column;
        }

        .theme-options {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Initialize UI interactions
  initializeUIInteractions() {
    // Set up tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to current tab and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const theme = option.getAttribute('data-theme');
        this.applyTheme(theme);
      });
    });

    // Exploration modes
    document.querySelectorAll('.mode-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        const mode = option.getAttribute('id');
        this.setExplorationMode(mode);
      });
    });

    // Quick actions
    document.getElementById('show-trending').addEventListener('click', () => this.showTrendingPapers());
    document.getElementById('show-influential').addEventListener('click', () => this.showTopAuthors());
    document.getElementById('show-datasets').addEventListener('click', () => this.showPopularDatasets());

    // Visual controls
    const backgroundSlider = document.getElementById('background-darkness');
    if (backgroundSlider) {
      backgroundSlider.addEventListener('input', e => {
        const darkness = parseFloat(e.target.value);
        document.body.style.backgroundColor = `rgb(${Math.round((1 - darkness) * 25)}, ${Math.round((1 - darkness) * 25)}, ${Math.round((1 - darkness) * 30)})`;
      });
    }

    const bloomToggle = document.getElementById('enable-bloom');
    if (bloomToggle) {
      bloomToggle.addEventListener('change', e => {
        this.toggleBloomEffect(e.target.checked);
      });
    }

    const particlesToggle = document.getElementById('enable-particles');
    if (particlesToggle) {
      particlesToggle.addEventListener('change', e => {
        this.toggleParticles(e.target.checked);
      });
    }

    const labelsToggle = document.getElementById('enable-labels');
    if (labelsToggle) {
      labelsToggle.addEventListener('change', e => {
        this.toggleNodeLabels(e.target.checked);
      });
    }

    // Advanced search functionality
    const advancedSearch = document.getElementById('advanced-search');
    const searchButton = document.querySelector('.search-button');

    if (advancedSearch && searchButton) {
      const performAdvancedSearch = () => {
        const searchTerm = advancedSearch.value.trim().toLowerCase();
        if (searchTerm.length < 2) return;

        this.performAdvancedSearch(searchTerm);
      };

      searchButton.addEventListener('click', performAdvancedSearch);
      advancedSearch.addEventListener('keypress', e => {
        if (e.key === 'Enter') performAdvancedSearch();
      });
    }

    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => this.applyFilters());
    }
  }

  // Apply color theme
  applyTheme(theme) {
    let colors = {
      paper: '#4f46e5',
      author: '#8b5cf6',
      dataset: '#ec4899'
    };

    switch (theme) {
      case 'neon':
        colors = {
          paper: '#00ff87',
          author: '#60efff',
          dataset: '#0061ff'
        };
        break;
      case 'pastel':
        colors = {
          paper: '#fb7185',
          author: '#e879f9',
          dataset: '#60a5fa'
        };
        break;
    }

    this.Graph.nodeColor(node => {
      switch (node.type) {
        case 'paper': return colors.paper;
        case 'author': return colors.author;
        case 'dataset': return colors.dataset;
        default: return '#ffffff';
      }
    });
  }

  // Set exploration mode
  setExplorationMode(mode) {
    const datasetFilter = document.getElementById('dataset-filter');

    switch (mode) {
      case 'citation-network':
        // Show citation relationships
        this.graphMode = 'citation';
        break;
      case 'author-collab':
        // Show author collaborations
        this.graphMode = 'author';
        break;
      case 'dataset-focus':
        // Focus on datasets and papers using them
        this.graphMode = 'dataset';
        break;
    }

    this.updateGraphData();
  }

  // Update graph data based on current filters and mode
  updateGraphData() {
    // Apply current filters and render
    const filteredData = this.filterGraphData();
    this.Graph.graphData(filteredData);
  }

  // Filter graph data based on current filters
  filterGraphData() {
    const yearMin = parseInt(document.getElementById('year-min').value);
    const yearMax = parseInt(document.getElementById('year-max').value);
    const citMin = parseInt(document.getElementById('citation-min').value);
    const citMax = parseInt(document.getElementById('citation-max').value);
    const relType = document.getElementById('relationship-type').value;
    const datasetFilter = document.getElementById('dataset-filter').value;

    // Filter nodes
    const filteredNodes = this.graphData.nodes.filter(node => {
      if (node.type === 'paper') {
        const year = node.year || 0;
        const citations = node.citations || 0;
        return (year >= yearMin && year <= yearMax) &&
          (citations >= citMin && (citMax === this.maxCitationCount || citations <= citMax)) &&
          (datasetFilter === '' || node.datasets?.includes(datasetFilter));
      }
      return true; // Keep authors and datasets
    });

    // Get IDs of filtered nodes
    const filteredIds = new Set(filteredNodes.map(node => node.id));

    // Filter links
    const filteredLinks = this.graphData.links.filter(link => {
      const sourceIncluded = filteredIds.has(link.source);
      const targetIncluded = filteredIds.has(link.target);

      if (!sourceIncluded || !targetIncluded) return false;

      if (relType === 'all') return true;
      return link.type === relType;
    });

    // For author and dataset modes, we might want to filter further
    if (this.graphMode !== 'citation') {
      // Additional filtering logic for author and dataset modes
      // ...
    }

    return { nodes: filteredNodes, links: filteredLinks };
  }

  // Quick action functions
  showTrendingPapers() {
    // Find papers with high recent citation count
    const trendingPapers = this.graphData.nodes
      .filter(node => node.type === 'paper' && node.citations > 0)
      .sort((a, b) => {
        // Sort by citations per year since publication
        const aYearsOld = new Date().getFullYear() - a.year;
        const bYearsOld = new Date().getFullYear() - b.year;

        const aCitationsPerYear = aYearsOld > 0 ? a.citations / aYearsOld : a.citations;
        const bCitationsPerYear = bYearsOld > 0 ? b.citations / bYearsOld : b.citations;

        return bCitationsPerYear - aCitationsPerYear;
      })
      .slice(0, 10);

    // Highlight these papers in the graph
    this.highlightNodes(trendingPapers);
  }

  showTopAuthors() {
    // Find authors with most papers or citations
    const topAuthors = this.graphData.nodes
      .filter(node => node.type === 'author')
      .sort((a, b) => (b.paperCount || 0) - (a.paperCount || 0))
      .slice(0, 10);

    // Highlight these authors in the graph
    this.highlightNodes(topAuthors);
  }

  showPopularDatasets() {
    // Find datasets used in most papers
    const popularDatasets = this.graphData.nodes
      .filter(node => node.type === 'dataset')
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10);

    // Highlight these datasets in the graph
    this.highlightNodes(popularDatasets);
  }

  // Highlight specific nodes in the graph
  highlightNodes(nodesToHighlight) {
    const nodeIds = new Set(nodesToHighlight.map(node => node.id));

    // Highlight these nodes and fade the rest
    this.Graph.nodeColor(node => {
      if (nodeIds.has(node.id)) {
        // Highlighted node - use a brighter color
        switch (node.type) {
          case 'paper': return '#8be9fd';
          case 'author': return '#50fa7b';
          case 'dataset': return '#ff79c6';
          default: return '#ffffff';
        }
      } else {
        // Faded node
        switch (node.type) {
          case 'paper': return 'rgba(79, 70, 229, 0.3)';
          case 'author': return 'rgba(139, 92, 246, 0.3)';
          case 'dataset': return 'rgba(236, 72, 153, 0.3)';
          default: return 'rgba(255, 255, 255, 0.3)';
        }
      }
    });

    // Focus camera on these nodes
    if (nodesToHighlight.length > 0) {
      this.focusOnNodes(nodesToHighlight);
    }

    // Show info about the first highlighted node
    if (nodesToHighlight.length > 0) {
      this.showNodeInfo(nodesToHighlight[0]);
    }
  }

  // Focus camera on a set of nodes
  focusOnNodes(nodes) {
    if (!nodes || nodes.length === 0) return;

    // Calculate the centroid of the nodes
    const coords = nodes.reduce((acc, node) => {
      acc.x += node.x || 0;
      acc.y += node.y || 0;
      acc.z += node.z || 0;
      return acc;
    }, { x: 0, y: 0, z: 0 });

    coords.x /= nodes.length;
    coords.y /= nodes.length;
    coords.z /= nodes.length;

    // Move camera to look at these nodes
    this.Graph.cameraPosition(
      { x: coords.x, y: coords.y, z: coords.z + 100 }, // new position
      { x: coords.x, y: coords.y, z: coords.z },       // look-at position
      1000                                             // transition duration
    );
  }

  // Show detailed info about a node
  showNodeInfo(node) {
    const infoPanel = document.getElementById('node-info-panel');
    if (!infoPanel || !node) return;

    // Remove empty state
    infoPanel.innerHTML = '';

    let content = '';

    if (node.type === 'paper') {
      content = `
        <div class="node-info-header">
          <h3>${node.title}</h3>
          <div class="node-type-badge paper">Paper</div>
        </div>
        <div class="node-info-content">
          <div class="info-row">
            <div class="info-label">Authors</div>
            <div class="info-value">${node.authors?.join(', ') || 'Unknown'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Year</div>
            <div class="info-value">${node.year || 'Unknown'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Citations</div>
            <div class="info-value">${node.citations?.toLocaleString() || '0'}</div>
          </div>
          ${node.doi ? `
            <div class="info-row">
              <div class="info-label">DOI</div>
              <div class="info-value">
                <a href="https://doi.org/${node.doi}" target="_blank">${node.doi}</a>
              </div>
            </div>
          ` : ''}
          ${node.abstract ? `
            <div class="abstract-container">
              <div class="info-label">Abstract</div>
              <div class="info-value">${node.abstract}</div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (node.type === 'author') {
      content = `
        <div class="node-info-header">
          <h3>${node.name}</h3>
          <div class="node-type-badge author">Author</div>
        </div>
        <div class="node-info-content">
          <div class="info-row">
            <div class="info-label">Papers</div>
            <div class="info-value">${node.paperCount || '0'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Total Citations</div>
            <div class="info-value">${node.totalCitations?.toLocaleString() || '0'}</div>
          </div>
          ${node.institution ? `
            <div class="info-row">
              <div class="info-label">Institution</div>
              <div class="info-value">${node.institution}</div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (node.type === 'dataset') {
      content = `
        <div class="node-info-header">
          <h3>${node.name}</h3>
          <div class="node-type-badge dataset">Dataset</div>
        </div>
        <div class="node-info-content">
          <div class="info-row">
            <div class="info-label">Papers Using</div>
            <div class="info-value">${node.usageCount || '0'}</div>
          </div>
          ${node.url ? `
            <div class="info-row">
              <div class="info-label">URL</div>
              <div class="info-value">
                <a href="${node.url}" target="_blank">${node.url}</a>
              </div>
            </div>
          ` : ''}
          ${node.description ? `
            <div class="abstract-container">
              <div class="info-label">Description</div>
              <div class="info-value">${node.description}</div>
            </div>
          ` : ''}
        </div>
      `;
    }

    infoPanel.innerHTML = content;
  }

  // Advanced search functionality
  performAdvancedSearch(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return;

    // Search in papers (title, abstract, authors)
    const paperMatches = this.graphData.nodes.filter(node => {
      if (node.type !== 'paper') return false;

      const inTitle = node.title?.toLowerCase().includes(searchTerm);
      const inAbstract = node.abstract?.toLowerCase().includes(searchTerm);
      const inAuthors = node.authors?.some(author => author.toLowerCase().includes(searchTerm));

      return inTitle || inAbstract || inAuthors;
    });

    // Search in authors
    const authorMatches = this.graphData.nodes.filter(node => {
      if (node.type !== 'author') return false;
      return node.name?.toLowerCase().includes(searchTerm);
    });

    // Search in datasets
    const datasetMatches = this.graphData.nodes.filter(node => {
      if (node.type !== 'dataset') return false;

      const inName = node.name?.toLowerCase().includes(searchTerm);
      const inDescription = node.description?.toLowerCase().includes(searchTerm);

      return inName || inDescription;
    });

    // Combine results
    const allMatches = [...paperMatches, ...authorMatches, ...datasetMatches];

    if (allMatches.length > 0) {
      // Highlight matches
      this.highlightNodes(allMatches);
    } else {
      // No matches found - show a notification
      this.showNotification('No matches found for: ' + searchTerm);
    }
  }

  // Show a temporary notification
  showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Toggle visual effects
  toggleBloomEffect(enabled) {
    // Implementation depends on your 3D rendering setup
    if (this.Graph.postProcessingComposer) {
      const bloomPass = this.Graph.postProcessingComposer.passes.find(pass => pass.name === 'bloom');
      if (bloomPass) {
        bloomPass.enabled = enabled;
      }
    }
  }

  toggleParticles(enabled) {
    if (enabled) {
      this.Graph.linkDirectionalParticles(2);
    } else {
      this.Graph.linkDirectionalParticles(0);
    }
  }

  toggleNodeLabels(enabled) {
    if (enabled) {
      this.Graph.nodeLabel(node => {
        if (node.type === 'paper') return node.title;
        return node.name;
      });
    } else {
      this.Graph.nodeLabel(null);
    }
  }

  // Apply all current filters
  applyFilters() {
    this.updateGraphData();
  }
}

// Export GraphManager for use in other modules
window.GraphManager = GraphManager;