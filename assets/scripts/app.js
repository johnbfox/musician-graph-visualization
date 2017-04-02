var app = angular.module('myApp', []);
app.config(function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[{');
  $interpolateProvider.endSymbol('}]}');
});

app.controller('myCtrl', ['$scope', '$http' , function($scope, $http) {

    $scope.autoIndex = -1;

    $scope.focusAutocomplete = function($event){
      if($scope.autoIndex > -1){
        $scope.names[$scope.autoIndex].active = false;
      }

      if($event.keyCode == 40 || $event.keyCode == 38){
        if($event.keyCode == 40){
          $scope.autoIndex++;
        }else if($event.keyCode == 38){
          $scope.autoIndex--;
        }
        $scope.focusedArtist = $scope.names[$scope.autoIndex].name;
        $scope.names[$scope.autoIndex].active = true;
      }
    }

    $scope.$watch('graphArtist', function(){
      $scope.autoIndex = -1;
      $scope.focusedArtist = undefined;
      var url = `getNames/${$scope.graphArtist}`;

      $http.get(url).then(function(response){
        var autoNames = [];
        for(name of response.data.names){
          autoNames.push({
            'name': name,
            'active': false
          });
        }

        $scope.names = autoNames;
        if(autoNames.length > 1){
          $scope.isAutocompleteShowing = true;
        }
      });
    });

    $scope.submitWithCurrent = function(){
      $scope.submitGraph($scope.graphArtist);
    }

    $scope.submitGraph = function(name){
      $scope.graphArtist = $scope.focusedArtist || name;
      var url = `getGraph/${$scope.graphArtist}`;
      $scope.isAutocompleteShowing = false;

      // Force diagram constants
      var graphContainerId = '#graphContainer',
          tooltipId = '#tt-name',
          width = 800,
          height = 600,
          radius = 11,
          nodeColors = ['#35586C', '#87CEEB', '#D1EEEE'],
          nodeHoverColor = 'orange',
          legendImagePath = 'images/legend-image.png',
          legendX = 645,
          legendY = 555,
          legendWidth = 150;


      var svg = d3.select('svg');
      svg.remove();
      svg = d3.select(graphContainerId).append('svg');

      svg.attr('id', 'graphVis')
         .attr('width', width)
         .attr('height', height);

      $http.get(url).then(function(response){

        // Response dependent constants
        var gravity = -1* (4200/(response.data.nodes.length)),
            graph = response.data;

        if(response.data.nodes.length === 0){
          console.log('Artist not found');

          var artistNotFound = svg.append('text')
                        .attr('x', 260)
                        .attr('y', 280)
                        .attr('fill', '#f08080')
                        .attr('dy', '.35em')
                        .attr('font-size', '36px')
                        .text('Artist Not Found');

          return;
        }

        var tooltip = createTooltip();

        tooltip.append('div')
            .attr('id', 'tt-name')
            .text('simple');

       //Add the legend to the graph
       svg.append('image')
          .attr('x', legendX)
          .attr('y', legendY)
          .attr('width', legendWidth)
          .attr('xlink:href', legendImagePath);

        var color = d3.scaleOrdinal(d3.schemeCategory20);

        // Define the force simulation
        var simulation = d3.forceSimulation()
                          .force('link', d3.forceLink().id(function(d) { return d.id; }))
                          .force('charge', d3.forceManyBody().strength(gravity))
                          .force('center', d3.forceCenter(width / 2, height / 2))

        // Draw the relationship lines
        var link = svg.append('g')
                      .attr('class', 'links')
                      .selectAll('line')
                      .data(graph.links)
                      .enter().append('line')
                      .attr('stroke-width', function(d) { return 3-d.degree; });

        // Draw the artist nodes
        var node = svg.append('g')
                      .attr('class', 'nodes')
                      .selectAll('circle')
                      .data(graph.nodes)
                      .enter().append('circle')
                      .attr('class', 'node')
                      .on('dblclick', function(d){
                        $scope.submitGraph(d.id);
                      })
                      .attr('r', function(d){
                        if(d.id == response.data.artist) {
                          return radius;
                        }else{
                          return radius-(3*d.degree);
                        }
                      })
                      .attr('fill', function(d) {
                        if(d.id == response.data.artist) {
                          return nodeColors[0];
                        }else{
                          return nodeColors[d.degree];
                        }
                      })
                      .on('mouseover', function(d){
                        var cur = d3.select(this);
                        var curY = cur.attr('cy');
                        var curX = cur.attr('cx');
                        d3.select(this)
            	           .attr('fill', nodeHoverColor);
                         tooltip.select(tooltipId).text(d.id);
                         return tooltip.style('visibility', 'visible');
                      })
                      .on('mousemove', function(){
                        return tooltip.style('top', (d3.event.pageY + 15) + 'px').style('left', (d3.event.pageX) + 'px');
                      })
                      .on('mouseout', function(d){
                        if(d.id === $scope.graphArtist) {
                          d3.select(this)
              	           .attr('fill', nodeColors[0]);
                        }else{
                          d3.select(this)
              	           .attr('fill', nodeColors[d.degree]);
                        }
                        return tooltip.style('visibility', 'hidden');
                      })
                      .call(d3.drag()
                      .on('start', dragstarted)
                      .on('drag', dragged)
                      .on('end', dragended));

          simulation.nodes(graph.nodes)
                    .on('tick', ticked);

          simulation.force('link')
                    .links(graph.links);

          function ticked() {
              node.attr('cx', function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
                .attr('cy', function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });

              link.attr('x1', function(d) { return d.source.x; })
                  .attr('y1', function(d) { return d.source.y; })
                  .attr('x2', function(d) { return d.target.x; })
                  .attr('y2', function(d) { return d.target.y; });
          }

          function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            tooltip.style('visibility', 'hidden');
          }

          function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
            tooltip.style('visibility', 'hidden');
          }

          function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            tooltip.style('visibility', 'hidden');
          }
      });
    }

    $scope.submitGraph('Bob Dylan');
}]);


// Helper functions
function createTooltip(){
  return d3.select('#graphContainer')
      .append('div')
      .attr('class', 'my-tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('padding', '5px')
      .style('border-style', 'solid')
      .style('border-width', 'thin');
}
