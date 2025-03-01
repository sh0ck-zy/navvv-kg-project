// js/controls.js

class ControlsManager {
    constructor(graphManager) {
        this.graphManager = graphManager;
    }

    setupEventListeners() {
        // Ensure all controls exist before attaching listeners

        // Node size
        const nodeSizeSlider = document.getElementById('node-size');
        if (nodeSizeSlider) {
            nodeSizeSlider.addEventListener('input', e => {
                this.graphManager.Graph.nodeRelSize(parseFloat(e.target.value));
            });
        }

        // Node brightness
        const nodeBrightnessSlider = document.getElementById('node-brightness');
        if (nodeBrightnessSlider) {
            nodeBrightnessSlider.addEventListener('input', e => {
                const brightness = parseFloat(e.target.value);
                this.graphManager.Graph.scene().traverse(obj => {
                    if (obj.isMesh && obj.material.uniforms && obj.material.uniforms.u_brightness) {
                        obj.material.uniforms.u_brightness.value = brightness;
                    }
                });
            });
        }

        // Link opacity
        const linkOpacitySlider = document.getElementById('link-opacity');
        if (linkOpacitySlider) {
            linkOpacitySlider.addEventListener('input', e => {
                this.graphManager.Graph.linkOpacity(parseFloat(e.target.value));
            });
        }

        // Particle speed
        const particleSpeedSlider = document.getElementById('particle-speed');
        if (particleSpeedSlider) {
            particleSpeedSlider.addEventListener('input', e => {
                this.graphManager.Graph.linkDirectionalParticleSpeed(parseFloat(e.target.value));
            });
        }

        // Particle count
        const particleCountSlider = document.getElementById('particle-count');
        if (particleCountSlider) {
            particleCountSlider.addEventListener('input', e => {
                this.graphManager.Graph.linkDirectionalParticles(parseInt(e.target.value));
            });
        }

        // Relationship type filter
        const relationshipSelect = document.getElementById('relationship-type');
        if (relationshipSelect) {
            relationshipSelect.addEventListener('change', () => this.graphManager.applyFilters());
        }

        // Year range sliders
        const yearMinSlider = document.getElementById('year-min');
        const yearMaxSlider = document.getElementById('year-max');
        const yearMinDisplay = document.getElementById('year-min-display');
        const yearMaxDisplay = document.getElementById('year-max-display');

        if (yearMinSlider && yearMaxSlider) {
            yearMinSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                yearMinDisplay.textContent = val;
                if (val > parseInt(yearMaxSlider.value)) {
                    yearMaxSlider.value = val;
                    yearMaxDisplay.textContent = val;
                }
                this.graphManager.applyFilters();
            });

            yearMaxSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                yearMaxDisplay.textContent = val;
                if (val < parseInt(yearMinSlider.value)) {
                    yearMinSlider.value = val;
                    yearMinDisplay.textContent = val;
                }
                this.graphManager.applyFilters();
            });
        }

        // Citation range sliders
        const citMinSlider = document.getElementById('citation-min');
        const citMaxSlider = document.getElementById('citation-max');
        const citMinDisplay = document.getElementById('citation-min-display');
        const citMaxDisplay = document.getElementById('citation-max-display');

        if (citMinSlider && citMaxSlider) {
            citMinSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                citMinDisplay.textContent = val.toLocaleString();
                if (val > parseInt(citMaxSlider.value)) {
                    citMaxSlider.value = val;
                    citMaxDisplay.textContent = val.toLocaleString() + (val === this.graphManager.maxCitationCount ? "+" : "");
                }
                this.graphManager.applyFilters();
            });

            citMaxSlider.addEventListener('input', e => {
                const val = parseInt(e.target.value);
                citMaxDisplay.textContent = val.toLocaleString() + (val === this.graphManager.maxCitationCount ? "+" : "");
                if (val < parseInt(citMinSlider.value)) {
                    citMinSlider.value = val;
                    citMinDisplay.textContent = val.toLocaleString();
                }
                this.graphManager.applyFilters();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                if (yearMinSlider && yearMaxSlider && citMinSlider && citMaxSlider) {
                    document.getElementById('relationship-type').value = 'all';
                    yearMinSlider.value = this.graphManager.minYear;
                    yearMaxSlider.value = this.graphManager.maxYear;
                    yearMinDisplay.textContent = this.graphManager.minYear;
                    yearMaxDisplay.textContent = this.graphManager.maxYear;
                    citMinSlider.value = 0;
                    citMaxSlider.value = this.graphManager.maxCitationCount;
                    citMinDisplay.textContent = "0";
                    citMaxDisplay.textContent = this.graphManager.maxCitationCount.toLocaleString() + "+";
                    this.graphManager.applyFilters();
                }
            });
        }

        // Reset camera button
        const resetCameraBtn = document.getElementById('reset-camera');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.graphManager.Graph.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000);
            });
        }

        // Window resize for responsive graph
        window.addEventListener('resize', () => {
            this.graphManager.Graph.width(window.innerWidth);
            this.graphManager.Graph.height(window.innerHeight);
        });

        // (Optional) Set up search, export, and legend elements as in the original.
        // For brevity, here’s an example for search:
        const searchBox = document.createElement('div');
        searchBox.innerHTML = `
      <div style="position: absolute; top: 10px; left: 10px; z-index: 10; background: rgba(0, 0, 0, 0.7); border-radius: 5px; padding: 10px;">
        <input type="text" id="search-input" placeholder="Search papers or authors..." 
               style="width: 250px; background: #111; color: #fff; border: 1px solid #333; padding: 5px; border-radius: 3px;">
        <button id="search-button" style="background: #2a4c7d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
            Search
        </button>
        <div id="search-results" style="max-height: 200px; overflow-y: auto; display: none; margin-top: 10px;"></div>
      </div>
    `;
        document.body.appendChild(searchBox);

        const searchButton = document.getElementById('search-button');
        const searchInput = document.getElementById('search-input');
        if (searchButton && searchInput) {
            searchButton.addEventListener('click', () => this.performSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }
    }

    // Search function (example)
    performSearch() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const resultsDiv = document.getElementById('search-results');
        if (searchTerm.length < 2) {
            resultsDiv.innerHTML = '<p style="color: #ff8888;">Please enter at least 2 characters</p>';
            resultsDiv.style.display = 'block';
            return;
        }
        const matchingNodes = this.graphManager.graphData.nodes.filter(node => {
            if (node.type === 'paper') {
                return node.title.toLowerCase().includes(searchTerm);
            } else {
                return node.name.toLowerCase().includes(searchTerm);
            }
        }).slice(0, 10);
        if (matchingNodes.length === 0) {
            resultsDiv.innerHTML = '<p style="color: #ff8888;">No results found</p>';
        } else {
            resultsDiv.innerHTML = matchingNodes.map(node => {
                const label = node.type === 'paper' ? node.title : node.name;
                return `<div style="padding: 5px; border-bottom: 1px solid #333; cursor: pointer;" 
                  data-id="${node.id}" class="search-result-item">
                  ${label} (${node.type})
                </div>`;
            }).join('');
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const nodeId = item.getAttribute('data-id');
                    const node = this.graphManager.graphData.nodes.find(n => n.id === nodeId);
                    if (node) {
                        this.graphManager.Graph.centerAt(node.x, node.y, node.z, 1000);
                        this.graphManager.Graph.zoomToFit(400, 500, n => n.id === nodeId);
                        this.graphManager.showNodeInfo(node);
                        resultsDiv.style.display = 'none';
                    }
                });
            });
        }
        resultsDiv.style.display = 'block';
    }
}

// Expose ControlsManager globally
window.ControlsManager = ControlsManager;
