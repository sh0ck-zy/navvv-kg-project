// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Create an instance of GraphManager
    const graphManager = new GraphManager();
    // Create an instance of ControlsManager with the graphManager instance
    const controlsManager = new ControlsManager(graphManager);

    // Initialize the graph (this returns a promise)
    graphManager.initGraph().then(() => {
        // Once the graph is ready, set up UI event listeners
        controlsManager.setupEventListeners();
    }).catch(error => {
        console.error("Error initializing graph:", error);
        document.getElementById('loading-indicator').innerHTML = `
      <h2>Error Loading Data</h2>
      <p>${error.message}</p>
      <p>Check console for details</p>
    `;
    });
});
