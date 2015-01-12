/*global cytoscape*/
(function(window, $, cytoscape, undefined) {
	'use strict';

	var appContext = $('[data-app-name="aip-interactions-viewer"]');

	// Variables for graph
	var nodes = [], edges = [];

	window.addEventListener('Agave::ready', function() {
		var Agave = window.Agave;

		// Variable
		var el, i, cytoscapeJsUrl, arborJsUrl, reCytoscape, reArbor, hasCytoscape, hasArbor, allScripts;

		// Intialize
		// This is code from old AIP BAR interactions viewer (not sure if the app would work without it!)
		function init() {
			cytoscapeJsUrl = 'bower_components/cytoscape/dist/cytoscape.min.js';	// The cytoscape.js 
			arborJsUrl = 'bower_components/cytoscape/lib/arbor.js';	// The layout file

			hasCytoscape = hasArbor = false;
			reCytoscape = new RegExp(cytoscapeJsUrl);
			reArbor = new RegExp(arborJsUrl);
			allScripts = document.querySelectorAll('script');

			// This is checking if cytoscape is present
			for (i = 0; i < allScripts.length && !(hasCytoscape); i++) {
				hasCytoscape = hasCytoscape || reCytoscape.test(allScripts[i].src);
				hasArbor = hasArbor || reCytoscape.test( allScripts[i].src );
			}

			// If we don't have cytoscape, add it
			if (!hasCytoscape) {
				el = document.createElement('script');
				el.src = cytoscapeJsUrl;
				el.type = 'text/javascript';
				document.body.appendChild(el);
			}

			// If we don't have Arbor, add it
			if (!hasArbor) {
				el = document.createElement( 'script' );
				el.src = arborJsUrl;
				el.type = 'text/javascript';
				document.body.appendChild( el );
			}
		}
		init();


		$(document).ready(function() {
			// This function loads cytoscape. 'elements' stores the newtwork
			var loadCy = function(elements) {
				var myStyle = 'node { content: data(name);}';
				$('#cyto').removeClass('hidden').cytoscape({
					layout: {
						name: 'arbor',
						liveUpdate: true,
						maxSimulationTime: 4000,
						padding: [ 50, 50, 50, 50 ],
						ungrabifyWhileSimulating: true,
						gravity: true,
						stepSize: 1
					},
					style: myStyle, 					
					elements: elements
				}); // End .cytoscape()
			}; //  End loadCy()

			// This function will validate loci
			var isLociValid = function(loci) {
				var result = true;
				var patt = /^AT(\d|C|M)G\d{5,5}$/i;
				for (var i = 0; i < loci.length; i++) {
					if (!patt.test(loci[i])) {
						result = false;
					}		
				}
				return result;
			};

			// Reset button
			$('#interactions-form', appContext).on('reset', function() {
				document.forms['interactions-form'].loci.value = '';
				$('#cyto').addClass('hidden');
			});

			// Submit button
			$('#interactions-form', appContext).on('submit', function(e) {
				e.preventDefault();
				
				// Declare variables
				var loci = $('#loci', appContext).val().split('\n');	// Get the data from textarea and convert it to array
				var query = {};	// Query data for the BAR interactions webservice
				var elements = {};	// The final cytoscape data with nodes and edges
				var pubData, inputLociOnly;

				// Initialize variables
				nodes = [];	// Nodes of cytoscape graph
				edges = [];	// Edges of cytoscape graph

				// See if the user wants published data or not
				if ($('#pub', appContext).prop('checked')) {
					pubData = true;
				} else {
					pubData = false;
				}

				// See if only user supplied AGI should be included
				if ($('#input-loci-only', appContext).prop('checked')) {
					inputLociOnly = true;
				} else {
					inputLociOnly = false;
				}

				// Validate data
				if (!isLociValid(loci)) {
					window.alert('Invalid locus ID.');
					return;
				}

				// This function only makes element object just as a workaround for javascript async issues!
				function makeCy() {
					elements = {nodes: nodes, edges: edges};
					loadCy(elements);
				}

				// Add query to nodes
				function addData(i, callback) {
					query = {
						locus: loci[i],
						published: pubData
					};

					Agave.api.adama.search({
						'namespace': 'asher', 'service': 'interactions_v0.1', 'queryParams': query
					}, function(response) {
						nodes.push({data: {
							id: loci[i],
							name: loci[i]
						}});

						for (var j = 0; j < response.obj.result.length; j++) {
							nodes.push({data: {
								id: response.obj.result[j].locus,
								name: response.obj.result[j].locus
							}});
						
							edges.push({data: {
								source: loci[i], 
								target: response.obj.result[j].locus
							}});
						}

						// When this is done, call the callback function. I don't know how to do this without creathing 'callback hell'
						if (i === loci.length - 1) {
							callback();
						}
					});
				}

				// Add data for each user supplied Locus
				for (var i = 0; i < loci.length; i++) {
					addData(i, makeCy);
				}
			});					

			// About button
			$('#about').click(function() {
				window.alert('This app was developed by the BAR team with help from the AIP team. The data is obtained from BAR databases using webservices.');
			});
		});
	});
})(window, jQuery, cytoscape);
