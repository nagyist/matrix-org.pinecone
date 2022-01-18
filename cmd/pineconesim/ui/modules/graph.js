import { openRightPanel, closeRightPanel } from "./ui.js";
import { ConvertNodeTypeToString, APINodeType } from "./server-api.js";

// You can supply an element as your title.
var titleElement = document.createElement("div");
titleElement.style.height = "15em";
// titleElement.style.minWidth = "10em";
titleElement.style.width = "max-content";
titleElement.style.color = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-dull-grey');
titleElement.style.backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-dark-grey');
titleElement.style.padding = "5px";
titleElement.style.margin = "-4px";
titleElement.id = "nodeTooltip";

let selectedNodes = null;
let hoverNode = null;

let Nodes = new Map();

class Graph {
    nodeIDs = [];

    peerNodes = new vis.DataSet([]);
    peerEdges = new vis.DataSet([]);
    peerData = {
        nodes: this.peerNodes,
        edges: this.peerEdges
    };

    snakeNodes = new vis.DataSet([]);
    snakeEdges = new vis.DataSet([]);
    snakeData = {
        nodes: this.snakeNodes,
        edges: this.snakeEdges
    };

    treeNodes = new vis.DataSet([]);
    treeEdges = new vis.DataSet([]);
    treeData = {
        nodes: this.treeNodes,
        edges: this.treeEdges
    };

    geoNodes = new vis.DataSet([]);
    geoEdges = new vis.DataSet([]);
    geoData = {
        nodes: this.geoNodes,
        edges: this.geoEdges
    };

    options = {
        interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true,
            hover: true,
            tooltipDelay: 100,
            multiselect: true,
        },
        physics: {
            enabled: true,
            maxVelocity: 40,
            minVelocity: 2,
            timestep: 0.6,
            adaptiveTimestep: true,
            solver: "forceAtlas2Based",
            forceAtlas2Based: {
                theta: 0.5,
                centralGravity: 0.001,
                gravitationalConstant: -70,
                springLength: 100,
                springConstant: 0.6,
                damping: 0.8,
                avoidOverlap: 0,
            },
            stabilization: {
                enabled: true,
                onlyDynamicEdges: true,
            },
        },
        layout: {
            clusterThreshold: 50,
            improvedLayout: false,
        },
        nodes: {
            title: titleElement,
            borderWidth: 10,
            borderWidthSelected: 10,
            color: {
                background: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-router-blue'),
                border: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-router-blue'),
                highlight: {
                    background: getComputedStyle(document.documentElement)
                        .getPropertyValue('--color-ems-purple'),
                    border: getComputedStyle(document.documentElement)
                        .getPropertyValue('--color-ems-purple'),
                },
                hover: {
                    background: getComputedStyle(document.documentElement)
                        .getPropertyValue('--color-router-blue'),
                    border: getComputedStyle(document.documentElement)
                        .getPropertyValue('--color-router-blue'),
                },
            },
            font: {
                color: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-dull-grey'),
            },
            shadow: {
                enabled: true,
                size: 15,
                color: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-dark-grey'),
                x: 3,
                y: 3,
            },
        },
        edges: {
            color: {
                color: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-blue-pill'),
                highlight: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-dark-red'),
                hover: getComputedStyle(document.documentElement)
                    .getPropertyValue('--color-blue-pill'),
            },
            width: 2,
            selectionWidth: 4,
        },
    };

    network = null;
    canvas = null;
    currentData = null;
    started = false;

    constructor(canvas) {
        this.canvas = canvas;
        this.currentData = this.peerData;

        // Initialize Stats Panel
        handleStatsPanelUpdate();
        handleNodePanelUpdate();
    }

    startGraph() {
        this.started = true;
        this.network = new vis.Network(this.canvas, this.currentData, this.options);
        this.setupHandlers();
        this.updateUI("");

        // HACK : network won't restabilize unless I give a node a kick...
        this.kickNode(this.nodeIDs[0]);
    }

    isStarted() {
        return this.started;
    }

    setupHandlers() {
        this.network.on("showPopup", function (params) {
            let text = document.createElement('div');
            text.id = "nodePopupText";

            titleElement.appendChild(text);

            hoverNode = params;
            handleNodeHoverUpdate();
        });

        this.network.on("hidePopup", function () {
            hoverNode = null;
            handleNodeHoverUpdate();
        });

        this.network.on("stabilized", function (params) {
            console.log("Network stabilized");
        });

        this.network.on("selectNode", function (params) {
            selectedNodes = params.nodes;
            handleNodePanelUpdate();
            openRightPanel();
        });

        this.network.on("deselectNode", function (params) {
            selectedNodes = params.nodes;
            handleNodePanelUpdate();
        });
    }

    updateUI(node) {
        if (selectedNodes && selectedNodes.indexOf(node) > -1) {
            handleNodePanelUpdate();
        }
        if (hoverNode && hoverNode === node) {
            handleNodeHoverUpdate();
        }

        handleStatsPanelUpdate();
    }

    addNode(id, key, type) {
        let colour = getComputedStyle(document.documentElement).getPropertyValue('--color-router-blue');
        if (type === APINodeType.GeneralAdversary) {
            colour = getComputedStyle(document.documentElement).getPropertyValue('--color-dark-red');
        }
        this.peerData.nodes.add({ id: id, label: id, color: {
            background: colour, border: colour, hover: {
                background: colour, border: colour } } });
        this.snakeData.nodes.add({ id: id, label: id, color: {
            background: colour, border: colour, hover: {
                background: colour, border: colour } } });
        this.treeData.nodes.add({ id: id, label: id, color: {
            background: colour, border: colour, hover: {
                background: colour, border: colour } }});
        this.geoData.nodes.add({ id: id, label: id, color: {
            background: colour, border: colour, hover: {
                background: colour, border: colour } } });
        this.nodeIDs.push(id);

        Nodes.set(id, newNode(key, type));

        this.updateUI(id);
    }

    removeNode(id) {
        this.peerData.nodes.remove(id);
        this.snakeData.nodes.remove(id);
        this.treeData.nodes.remove(id);
        this.geoData.nodes.remove(id);

        const index = this.nodeIDs.indexOf(id);
        if (index > -1) {
            this.nodeIDs.splice(index, 1);
        }

        this.removeAllEdges("peer", id);
        this.removeAllEdges("tree", id);
        this.removeAllEdges("snake", id);
        this.removeAllEdges("geographic", id);

        Nodes.delete(id);

        this.deselectRemovedNodes();
        this.updateUI(id);
    }

    getNodeType(nodeID) {
        let nodeType = "";
        if (Nodes.has(nodeID)) {
            nodeType = Nodes.get(nodeID).nodeType;
        }

        return nodeType;
    }

    updateRootAnnouncement(id, root, sequence, time, coords) {
        if (Nodes.has(id)) {
            let node = Nodes.get(id);
            node.announcement.root = root;
            node.announcement.sequence = sequence;
            node.announcement.time = time;
            node.coords = coords;

            this.updateUI(id);
        }
    }

    addPeer(id, peer, port) {
        this.addEdge("peer", id, peer);
        if (Nodes.has(id)) {
            Nodes.get(id).peers.push({ id: peer, port: port });
        }

        this.updateUI(id);
    }

    removePeer(id, peer) {
        this.removeEdge("peer", id, peer);
        if (Nodes.has(id)) {
            let peers = Nodes.get(id).peers;
            for (let i = 0; i < peers.length; i++) {
                if (peers[i].id === peer) {
                    peers.splice(i, 1);
                }
            }

            this.updateUI(id);
        }
    }

    setTreeParent(id, parent, prev) {
        this.removeEdge("tree", id, prev);
        if (parent != "") {
            this.addEdge("tree", id, parent);
        }

        if (Nodes.has(id)) {
            Nodes.get(id).treeParent = parent;

            this.updateUI(id);
        }
    }

    setSnekAsc(id, asc, prev, path) {
        this.removeEdge("snake", id, prev);
        if (asc != "") {
            this.addEdge("snake", id, asc);
        }

        if (Nodes.has(id)) {
            let node = Nodes.get(id);
            node.snekAsc = asc;
            node.snekAscPath = path.replace(/\"/g, "").toUpperCase();

            this.updateUI(id);
        }
    }

    setSnekDesc(id, desc, prev, path) {
        this.removeEdge("snake", id, prev);
        if (desc != "") {
            this.addEdge("snake", id, desc);
        }

        if (Nodes.has(id)) {
            let node = Nodes.get(id);
            node.snekDesc = desc;
            node.snekDescPath = path.replace(/\"/g, "").toUpperCase();

            this.updateUI(id);
        }
    }

    addEdge(dataset, from, to) {
        switch(dataset) {
        case "peer":
            let matchingEdges = this.peerData.edges.get({
                filter: function (item) {
                    return ((item.from === from && item.to === to) || (item.to === from && item.from === to));
                }
            });

            // Don't create duplicate edges in the peer topology
            if (matchingEdges.length === 0) {
                this.peerData.edges.add({from, to});
            }
            break;
        case "snake":
            this.snakeData.edges.add({from, to});
            break;
        case "tree":
            this.treeData.edges.add({from, to});
            break;
        case "geographic":
            this.geoData.edges.add({from, to});
            break;
        }
    }

    removeEdge(dataset, from, to) {
        let matchingEdges = [];
        switch(dataset) {
        case "peer":
            matchingEdges = this.peerData.edges.get({
                filter: function (item) {
                    return ((item.from === from && item.to === to) || (item.to === from && item.from === to));
                }
            });

            if (matchingEdges.length >= 1) {
                for (let i = 0; i < matchingEdges.length; i++) {
                    this.peerData.edges.remove(matchingEdges[i]);
                }
            }
            break;
        case "snake":
            matchingEdges = this.snakeData.edges.get({
                filter: function (item) {
                    return (item.from === from && item.to === to);
                }
            });

            if (matchingEdges.length >= 1) {
                this.snakeData.edges.remove(matchingEdges[0]);
            }
            break;
        case "tree":
            matchingEdges = this.treeData.edges.get({
                filter: function (item) {
                    return (item.from === from && item.to === to);
                }
            });

            if (matchingEdges.length >= 1) {
                this.treeData.edges.remove(matchingEdges[0]);
            }
            break;
        case "geographic":
            matchingEdges = this.geoData.edges.get({
                filter: function (item) {
                    return (item.from === from && item.to === to);
                }
            });

            if (matchingEdges.length >= 1) {
                this.geoData.edges.remove(matchingEdges[0]);
            }
            break;
        }
    }

    removeAllEdges(dataset, id) {
        let matchingEdges = [];
        switch(dataset) {
        case "peer":
            matchingEdges = this.peerData.edges.get({
                filter: function (item) {
                    return (item.from === id || item.to === id);
                }
            });

            for (let i = 0; i < matchingEdges.length; i++) {
                this.peerData.edges.remove(matchingEdges[i]);
            }
            break;
        case "snake":
            matchingEdges = this.snakeData.edges.get({
                filter: function (item) {
                    return (item.from === id || item.to === id);
                }
            });

            for (let i = 0; i < matchingEdges.length; i++) {
                this.snakeData.edges.remove(matchingEdges[i]);
            }
            break;
        case "tree":
            matchingEdges = this.treeData.edges.get({
                filter: function (item) {
                    return (item.from === id || item.to === id);
                }
            });

            for (let i = 0; i < matchingEdges.length; i++) {
                this.treeData.edges.remove(matchingEdges[i]);
            }
            break;
        case "geographic":
            matchingEdges = this.geoData.edges.get({
                filter: function (item) {
                    return (item.from === id || item.to === id);
                }
            });

            for (let i = 0; i < matchingEdges.length; i++) {
                this.geoData.edges.remove(matchingEdges[i]);
            }
            break;
        }
    }

    stabilize() {
        if (this.network) {
            this.network.stabilize();
        }
    }

    startSimulation() {
        if (this.network) {
            this.network.startSimulation();
        }
    }

    stopSimulation() {
        if (this.network) {
            this.network.stopSimulation();
        }
    }

    saveNodePositions() {
        if (this.network) {
            this.network.storePositions();
        }
    }

    getNodePositions() {
        return this.network.getPositions();
    }

    focusSelectedNode() {
        if (selectedNodes && selectedNodes.length > 0) {
            this.focusNode(selectedNodes[selectedNodes.length - 1]);
        }
    }

    deselectRemovedNodes() {
        let nodeRemoved = false;

        if (selectedNodes) {
            for (let i = selectedNodes.length - 1; i >= 0; --i) {
                if (!Nodes.has(selectedNodes[i])) {
                    nodeRemoved = true;
                    if (hoverNode === selectedNodes[i]) {
                        hoverNode = null;
                    }
                    selectedNodes.splice(i, 1);
                }
            }
        }

        if (nodeRemoved) {
            handleNodePanelUpdate();
            handleNodeHoverUpdate();
            handleStatsPanelUpdate();
        }
    }

    selectNodes(nodes) {
        this.deselectRemovedNodes();

        if (nodes.length > 0) {
            this.network.selectNodes(nodes);
        }
        selectedNodes = nodes;
    }

    GetSelectedNodes() {
        this.deselectRemovedNodes();
        return selectedNodes;
    }

    GetSelectedPeerings() {
        let peerings = [];
        if (this.network && this.currentData === this.peerData) {
            let edgeIDs = this.network.getSelectedEdges();
            for (let i = 0; i < edgeIDs.length; i++) {
                let edge = this.currentData.edges.get(edgeIDs[i]);
                if (edge) {
                    peerings.push(this.currentData.edges.get(edgeIDs[i]));
                }
            }
        }

        return peerings;
    }

    focusNode(nodeID) {
        let options = {
            scale: 0.5,
            offset: { x: 0, y: 0 },
            animation: {
                duration: 1000,
                easingFunction: "easeInOutQuad",
            },
        };
        this.network.focus(nodeID, options);
    }

    changeDataSet(dataset) {
        this.saveNodePositions();

        switch(dataset) {
        case "peer":
            this.currentData = this.peerData;
            if (this.network) {
                this.network.setData(this.currentData);
            }
            break;
        case "snake":
            this.currentData = this.snakeData;
            if (this.network) {
                this.network.setData(this.currentData);
            }
            break;
        case "tree":
            this.currentData = this.treeData;
            if (this.network) {
                this.network.setData(this.treeData);
            }
            break;
        case "geographic":
            this.currentData = this.geoData;
            if (this.network) {
                this.network.setData(this.geoData);
            }
            break;
        }

        if (selectedNodes) {
            this.selectNodes(selectedNodes);
        }

        // HACK : network won't restabilize unless I give a node a kick...
        this.kickNode(this.nodeIDs[0]);
    }

    kickNode(node) {
        if (node && this.network) {
            let position = this.network.getPosition(node);
            this.network.moveNode(node, position.x + 0.1, position.y);
        }
    }
}

export var graph = new Graph(document.getElementById("canvas"));

function newNode(key, type) {
    return {
        nodeType: type,
        announcement: {
            root: "",
            sequence: 0,
            time: 0,
        },
        coords: [],
        peers: [],
        key: key,
        treeParent: "",
        snekAsc: "",
        snekAscPath: "",
        snekDesc: "",
        snekDescPath: "",
    };
}

function hideHoverPanel() {
    let prevText = document.getElementById('nodePopupText');
    if (prevText) {
        titleElement.removeChild(prevText);
    }

    hoverNode = null;
}

function handleNodeHoverUpdate() {
    if (!hoverNode) {
        hideHoverPanel();
        return;
    }

    let node = Nodes.get(hoverNode);
    if (!node) {
        hideHoverPanel();
        return;
    }

    let hoverPanel = document.getElementById('nodePopupText');
    if (hoverPanel) {
        let time = node.announcement.time.toString();
        hoverPanel.innerHTML = "<u><b>Node " + hoverNode + "</b></u>" +
            "<br>Key: " + node.key.slice(0, 16).replace(/\"/g, "").toUpperCase() +
            "<br>Type: " + ConvertNodeTypeToString(node.nodeType) +
            "<br>Coords: [" + node.coords + "]" +
            "<br>Tree Parent: " + node.treeParent +
            "<br>SNEK Desc: " + node.snekDesc +
            "<br>SNEK Asc: " + node.snekAsc +
            "<br><br><u>Announcement</u>" +
            "<br>Root: Node " + node.announcement.root +
            "<br>Sequence: " + node.announcement.sequence +
            "<br>Time: " + time.slice(0, time.length - 3) + " ms";
    }
}

function getNodeKey(nodeID) {
    let key = "";
    if (Nodes.has(nodeID)) {
        key = Nodes.get(nodeID).key;
    }

    return key;
}

function handleNodePanelUpdate() {
    let nodes = [];
    let nodePanel = document.getElementById('currentNodeState');
    if (nodePanel) {
        nodePanel.innerHTML = "";
    }

    if (selectedNodes) {
        for (let i = 0; i < selectedNodes.length; i++) {
            nodes.push({id: selectedNodes[i], node: Nodes.get(selectedNodes[i])});
        }
    }

    if (nodes.length === 0) {
        closeRightPanel();
        nodes.push({id: "", node: newNode("", "")});
    }

    for (let i = 0; i < nodes.length; i++) {
        let nodeID = nodes[i].id;
        let node = nodes[i].node;

        let peers = node.peers;
        let peerTable = "";
        for (let i = 0; i < peers.length; i++) {
            let root = "";
            let key = "";
            if (Nodes.has(peers[i].id)) {
                let peer = Nodes.get(peers[i].id);
                root = peer.announcement.root.replace(/\"/g, "").toUpperCase();
                key = peer.key.replace(/\"/g, "").toUpperCase();
            }
            peerTable += "<tr><td><code>" + peers[i].id + "</code></td><td><code>" + key.slice(0, 8) + "</code></td><td><code>" + peers[i].port + "</code></td><td><code>" + root + "</code></td></tr>";
        }

        if (nodePanel) {
            nodePanel.innerHTML +=
                "<h3>Node " + nodeID + "</h3>" +
                "<hr><table>" +
                "<tr><td>Name:</td><td>" + nodeID + "</td></tr>" +
                "<tr><td>Type:</td><td>" + ConvertNodeTypeToString(node.nodeType) + "</td></tr>" +
                "<tr><td>Coordinates:</td><td>[" + node.coords + "]</td></tr>" +
                "<tr><td>Public Key:</td><td><code>" + node.key.slice(0, 16).replace(/\"/g, "").toUpperCase() + "</code></td></tr>" +
                "<tr><td>Root Key:</td><td><code>" + getNodeKey(node.announcement.root).slice(0, 16).replace(/\"/g, "").toUpperCase() + "</code></td></tr>" +
                "<tr><td>Tree Parent:</td><td><code>" + node.treeParent + "</code></td></tr>" +
                "<tr><td>Descending Node:</td><td><code>" + node.snekDesc + "</code></td></tr>" +
                "<tr><td>Descending Path:</td><td><code>" + node.snekDescPath + "</code></td></tr>" +
                "<tr><td>Ascending Node:</td><td><code>" + node.snekAsc + "</code></td></tr>" +
                "<tr><td>Ascending Path:</td><td><code>" + node.snekAscPath + "</code></td></tr>" +
                "</table>" +
                "<hr><h4><u>Peers</u></h4>" +
                "<table>" +
                "<tr><th>Name</th><th>Public Key</th><th>Port</th><th>Root</th></tr>" +
                peerTable +
                "</table>" +
                "<hr><h4><u>SNEK Routes</u></h4>" +
                "<table>" +
                "<tr><th>Public Key</th><th>Path ID</th><th>Src</th><th>Dst</th><th>Seq</th></tr>" +
                "<tr><td><code><b>N/A</b></code></td><td><code><b>N/A</b></code></td><td><code><b>N/A</b></code></td><td><code><b>N/A</b></code></td><td><code><b>N/A</b></code></td></tr>" +
                "</table><hr><br>";
        }
    }
}

function handleStatsPanelUpdate() {
    let statsPanel = document.getElementById('simStatsPanel');
    let peerLinks = 0;
    let rootConvergence = new Map();

    let nodeTable = "";
    let rootTable = "";

    if (graph && graph.isStarted()) {
        for (const [key, value] of Nodes.entries()) {
            nodeTable += "<tr><td><code>" + key + "</code></td><td><code>[" + value.coords + "]</code></td><td><code>" + value.announcement.root + "</code></td><td><code>" + getNodeKey(value.snekDesc).slice(0, 4).replace(/\"/g, "").toUpperCase() + "</code></td><td><code>" + value.key.slice(0, 4).replace(/\"/g, "").toUpperCase() + "</code></td><td><code>" + getNodeKey(value.snekAsc).slice(0, 4).replace(/\"/g, "").toUpperCase() + "</code></td></tr>";

            peerLinks += value.peers.length;
            if (rootConvergence.has(value.announcement.root)) {
                rootConvergence.set(value.announcement.root, rootConvergence.get(value.announcement.root) + 1);
            } else {
                rootConvergence.set(value.announcement.root, 1);
            }
        }

        for (const [key, value] of rootConvergence.entries()) {
            rootTable += "<tr><td><code>" + key + "</code></td><td>" + (value / Nodes.size * 100).toFixed(2) + "%</td></tr>";
        }
    }

    statsPanel.innerHTML =
        "<div class=\"shift-right\"><h3>Statistics</h3></div>" +
        "<hr><table>" +
        "<tr><td>Node Count:</td><td style=\"text-align: left;\">" + Nodes.size + "</td></tr>" +
        "<tr><td>Path Count:</td><td style=\"text-align: left;\">" + peerLinks / 2 + "</td></tr>" +
        "<tr><td>Tree Path Convergence:</td><td style=\"text-align: left;\"><code><b>N/A</b></code></td></tr>" +
        "<tr><td>SNEK Path Convergence:</td><td style=\"text-align: left;\"><code><b>N/A</b></code></td></tr>" +
        "<tr><td>Tree Average Stretch:</td><td><code><b>N/A</b></code></td></tr>" +
        "<tr><td>SNEK Average Stretch:</td><td><code><b>N/A</b></code></td></tr>" +
        "</table>" +
        "<hr><h4><u>Node Summary</u></h4>" +
        "<table>" +
        "<tr><th>Name</th><th>Coords</th><th>Root</th><th>↓</th><th>Key</th><th>↑</th></tr>" +
        nodeTable +
        "</table>" +
        "<hr><h4><u>Tree Building</u></h4>" +
        "<table>" +
        "<tr><th>Root Node</th><th>Convergence</th></tr>" +
        rootTable +
        "</table>";
}
