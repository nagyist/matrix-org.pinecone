import { Graph } from "./modules/graph.js";
import "./modules/ui.js";

const worker = new Worker("scripts/websocket-worker.js");
export var graph = new Graph(document.getElementById("canvas"));

function handleSimMessage(msg) {
    console.log(msg.data);
    switch(msg.data.ID) {
    case 1: // Initial State
        for (let i = 0; i < msg.data.Nodes.length; i++) {
            graph.addNode(msg.data.Nodes[i]);
        }

        for (let [key, value] of Object.entries(msg.data.PhysEdges)) {
            for (let i = 0; i < msg.data.PhysEdges[key].length; i++) {
                graph.addEdge("physical", key, msg.data.PhysEdges[key][i]);
            }
        }

        for (let [key, value] of Object.entries(msg.data.SnakeEdges)) {
            for (let i = 0; i < msg.data.SnakeEdges[key].length; i++) {
                graph.addEdge("snake", key, msg.data.SnakeEdges[key][i]);
            }
        }

        for (let [key, value] of Object.entries(msg.data.TreeEdges)) {
            for (let i = 0; i < msg.data.TreeEdges[key].length; i++) {
                graph.addEdge("tree", key, msg.data.TreeEdges[key][i]);
            }
        }

        if (msg.data.End === true) {
            graph.startGraph();
        }
        break;
    default:
        console.log("Unhandled message ID");
        break;
    }
};

worker.onmessage = handleSimMessage;

// Start the websocket worker with the current url
worker.postMessage({url: window.origin.replace("http", "ws") + '/ws'});
