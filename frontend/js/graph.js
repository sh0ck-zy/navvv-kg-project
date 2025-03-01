// js/graph.js

class GraphManager {
  constructor() {
    this.graphData = { nodes: [], links: [] };
    this.filteredData = { nodes: [], links: [] };
    this.Graph = null;
    this.maxCitationCount = 0;
    this.minYear = 3000;
    this.maxYear = 0;
  }

  // Custom Shaders
  get vertexShader() {
    return `
      varying vec2 vUv;
      void main() {
          vUv = uv;
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
      void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float pulse = sin(u_time * 2.0) * 0.1 + 0.9;
          float glow = smoothstep(0.5, 0.0, dist) * u_brightness * pulse;
          vec3 color = u_color * glow;
          if (dist < 0.1) {
              color = mix(color, vec3(1.0), smoothstep(0.1, 0.0, dist) * pulse);
          }
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
      void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          float pulse = sin(u_time * 1.0) * 0.05 + 0.95;
          float glow = smoothstep(0.5, 0.0, dist) * u_brightness * pulse;
          float noise1 = fract(sin(dot(vUv + u_time * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
          float noise2 = fract(sin(dot(vUv + u_time * 0.02, vec2(39.9898, 27.233))) * 94724.3497);
          float nebula = mix(noise1, noise2, 0.5) * 0.3 + 0.7;
          vec3 color = u_color * glow * nebula;
          gl_FragColor = vec4(color, glow * 0.8);
      }
    `;
  }

  // Creates the custom node mesh using shaders
  createCosmicNode(node) {
    const isPaper = node.type === "paper";
    let size, color;
    if (isPaper) {
      const citationFactor = Math.log(node.citationCount + 1) / Math.log(this.maxCitationCount + 1);
      size = 3 + citationFactor * 7;
      const yearNormalized = (node.year - this.minYear) / ((this.maxYear - this.minYear) || 1);
      color = new THREE.Color().setHSL(0.6 - yearNormalized * 0.6, 1.0, 0.5);
    } else {
      size = 5;
      color = new THREE.Color(0.8, 0.4, 1.0);
    }

    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_brightness: { value: parseFloat(document.getElementById('node-brightness').value) },
        u_color: { value: color }
      },
      vertexShader: this.vertexShader,
      fragmentShader: isPaper ? this.paperFragmentShader : this.authorFragmentShader,
      transparent: true,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.onBeforeRender = (renderer, scene, camera) => {
      mesh.lookAt(camera.position);
      mesh.material.uniforms.u_time.value += 0.01;
    };

    return mesh;
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

      nodes.push({
        id: paper.paperId,
        title: paper.title,
        year: paper.year,
        abstract: paper.abstract,
        citationCount: paper.citationCount,
        referenceCount: paper.referenceCount,
        type: "paper"
      });

      paper.authors.forEach(author => {
        if (!authorsMap.has(author.authorId)) {
          authorsMap.set(author.authorId, {
            id: author.authorId,
            name: author.name,
            type: "author",
            paperCount: 0
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

    yearMinSlider.min = this.minYear;
    yearMinSlider.max = this.maxYear;
    yearMinSlider.value = this.minYear;

    yearMaxSlider.min = this.minYear;
    yearMaxSlider.max = this.maxYear;
    yearMaxSlider.value = this.maxYear;

    yearMinDisplay.textContent = this.minYear;
    yearMaxDisplay.textContent = this.maxYear;

    const citMinSlider = document.getElementById('citation-min');
    const citMaxSlider = document.getElementById('citation-max');
    const citMinDisplay = document.getElementById('citation-min-display');
    const citMaxDisplay = document.getElementById('citation-max-display');

    citMinSlider.max = this.maxCitationCount;
    citMaxSlider.max = this.maxCitationCount;
    citMaxSlider.value = this.maxCitationCount;

    citMinDisplay.textContent = "0";
    citMaxDisplay.textContent = this.maxCitationCount.toLocaleString() + "+";
  }

  // Apply filters to graphData and update the graph
  applyFilters() {
    const minYear = parseInt(document.getElementById('year-min').value);
    const maxYear = parseInt(document.getElementById('year-max').value);
    const minCitations = parseInt(document.getElementById('citation-min').value);
    const maxCitations = parseInt(document.getElementById('citation-max').value);
    const relationshipType = document.getElementById('relationship-type').value;

    const filteredPaperNodes = this.graphData.nodes.filter(node => {
      if (node.type !== 'paper') return false;
      if (node.year < minYear || node.year > maxYear) return false;
      if (node.citationCount < minCitations || node.citationCount > maxCitations) return false;
      return true;
    });

    const filteredPaperIds = new Set(filteredPaperNodes.map(node => node.id));
    const filteredLinks = this.graphData.links.filter(link => {
      // Ignora links onde source ou target são nulos ou indefinidos
      if (!link || !link.source || !link.target) return false;

      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;

      if (!filteredPaperIds.has(targetId) && !filteredPaperIds.has(sourceId)) return false;
      if (relationshipType !== 'all' && link.type !== relationshipType) return false;

      return true;
    });


    const relevantAuthorIds = new Set();
    filteredLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      if (link.relation === 'AUTHORED') relevantAuthorIds.add(sourceId);
    });

    const filteredAuthorNodes = this.graphData.nodes.filter(node =>
      node.type === 'author' && relevantAuthorIds.has(node.id)
    );

    const filteredNodes = [...filteredPaperNodes, ...filteredAuthorNodes];
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
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
  }

  // Show node info (for papers and authors)
  showNodeInfo(node) {
    const infoPanel = document.getElementById('info-panel');
    const infoTitle = document.getElementById('info-title');

    if (node.type === 'paper') {
      infoTitle.textContent = node.title;
      document.getElementById('info-content').innerHTML = `
        <p><strong>Year:</strong> <span id="info-year">${node.year}</span></p>
        <p><strong>Citations:</strong> <span id="info-citations">${node.citationCount.toLocaleString()}</span></p>
        <p><strong>References:</strong> <span id="info-references">${node.referenceCount}</span></p>
        <p><strong>Abstract:</strong></p>
        <div class="abstract" id="info-abstract">${node.abstract || 'No abstract available'}</div>
        <p><strong>Authors:</strong></p>
        <div class="author-list" id="info-authors">Loading authors...</div>
      `;

      const authorList = document.getElementById('info-authors');
      const authorLinks = this.graphData.links.filter(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return targetId === node.id && link.relation === 'AUTHORED';
      });
      if (authorLinks.length > 0) {
        const authorHtml = authorLinks.map(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const author = this.graphData.nodes.find(n => n.id === sourceId);
          return author ? `<div>${author.name}</div>` : '';
        }).join('');
        authorList.innerHTML = authorHtml || 'No authors found';
      } else {
        authorList.innerHTML = 'No authors found';
      }
      infoPanel.style.display = 'block';
    } else if (node.type === 'author') {
      infoTitle.textContent = node.name;
      const authoredPapers = this.graphData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        return sourceId === node.id && link.relation === 'AUTHORED';
      });
      const papersList = authoredPapers.map(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const paper = this.graphData.nodes.find(n => n.id === targetId);
        return paper ? `<div><strong>${paper.title}</strong> (${paper.year}, ${paper.citationCount} citations)</div>` : '';
      }).join('');
      document.getElementById('info-content').innerHTML = `
        <p><strong>Author:</strong> ${node.name}</p>
        <p><strong>Papers:</strong> ${node.paperCount}</p>
        <div class="author-list">
          ${papersList || 'No papers found'}
        </div>
      `;
      infoPanel.style.display = 'block';
    }
  }

  // Hide the info panel
  hideInfoPanel() {
    document.getElementById('info-panel').style.display = 'none';
  }

  // Initialize and load the graph
  async initGraph() {
    try {
      // Use the updated path (relative to index.html) if your JSON file is now at data/raw/papers_ml.json
      const response = await fetch('../data/raw/papers_ml.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const papers = await response.json();
      this.graphData = this.processData(papers);

      // Hide loading indicator
      document.getElementById('loading-indicator').style.display = 'none';

      // Create the ForceGraph3D instance with CSS2DRenderer if available
      const extraRenderers = [];
      if (typeof THREE.CSS2DRenderer === 'function') {
        extraRenderers.push(new THREE.CSS2DRenderer());
      }

      this.Graph = ForceGraph3D({
        extraRenderers: extraRenderers
      })(document.getElementById('graph-container'))
        .graphData(this.graphData)
        .nodeThreeObject(node => this.createCosmicNode(node))
        .nodeLabel(node => node.type === 'paper' ? node.title : node.name)
        .linkDirectionalParticles(parseInt(document.getElementById('particle-count').value))
        .linkDirectionalParticleSpeed(parseFloat(document.getElementById('particle-speed').value))
        .linkOpacity(parseFloat(document.getElementById('link-opacity').value))
        .linkWidth(1)
        .linkColor(link => link.type === 'authorship' ? new THREE.Color(0x88aaff) : new THREE.Color(0xff8844))
        .onNodeClick(node => this.showNodeInfo(node))
        .onBackgroundClick(() => this.hideInfoPanel())
        .nodeRelSize(parseFloat(document.getElementById('node-size').value));

      // Apply initial filters (if any)
      this.applyFilters();

      // Add background stars
      const scene = this.Graph.scene();
      const starsGeometry = new THREE.BufferGeometry();
      const starPositions = [];
      const starColors = [];
      for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starPositions.push(x, y, z);
        const r = Math.random() * 0.5 + 0.5;
        const g = Math.random() * 0.5 + 0.5;
        const b = Math.random() * 0.2 + 0.8;
        starColors.push(r, g, b);
      }
      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
      const starsMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
      });
      const starField = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(starField);

      // Start background animation
      this.animateBackground();

      console.log("Graph initialized with", papers.length, "papers");
    } catch (error) {
      console.error("Error loading data:", error);
      document.getElementById('loading-indicator').innerHTML = `
        <h2>Error Loading Data</h2>
        <p>${error.message}</p>
        <p>Check console for details</p>
      `;
    }
  }

  // Animate background (stars and node shader time updates)
  animateBackground() {
    requestAnimationFrame(this.animateBackground.bind(this));
    if (!this.Graph) return;
    const scene = this.Graph.scene();
    const starField = scene.children.find(obj => obj instanceof THREE.Points);
    if (starField) {
      starField.rotation.y += 0.0001;
      starField.rotation.x += 0.00005;
    }
    scene.traverse(obj => {
      if (obj.isMesh && obj.material.uniforms && obj.material.uniforms.u_time) {
        obj.material.uniforms.u_time.value += 0.01;
      }
    });
  }
}

// Expose GraphManager globally so it can be accessed from main.js and controls.js
window.GraphManager = GraphManager;
