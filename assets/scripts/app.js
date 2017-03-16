var app = angular.module('myApp', []);
app.config(function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[{');
  $interpolateProvider.endSymbol('}]}');
});

app.controller('myCtrl', ['$scope', '$http' , function($scope, $http) {

    $scope.autoIndex = -1;
    const colors = ['#87CEEB', '#D1EEEE', '#D1EEEE']

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
      var url = `/musician-graph/getNames/${$scope.graphArtist}`;

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

    $scope.submitGraph = function(name){
      $scope.graphArtist = $scope.focusedArtist || name;
      var url = `/musician-graph/getGraph/${$scope.graphArtist}`;
      $scope.isAutocompleteShowing = false;

      var svg = d3.select('svg');
      svg.remove();
      svg = d3.select('#graphContainer').append('svg');
      svg.attr('id', 'graphVis')
         .attr('width', 800)
         .attr('height', 600);

      $http.get(url).then(function(response){
        var graph = response.data;
        var gravity = -1* (4000/response.data.nodes.length);

        var svg = d3.select('#graphVis'),
            width = +svg.attr('width'),
            height = +svg.attr('height'),
            radius = 11;

        var color = d3.scaleOrdinal(d3.schemeCategory20);

        var simulation = d3.forceSimulation()
                          .force('link', d3.forceLink().id(function(d) { return d.id; }))
                          .force('charge', d3.forceManyBody().strength(gravity))
                          .force('center', d3.forceCenter(width / 2, height / 2))

        var link = svg.append('g')
                      .attr('class', 'links')
                      .selectAll('line')
                      .data(graph.links)
                      .enter().append('line')
                      .attr('stroke-width', function(d) { return 3-d.degree; });

        var node = svg.append('g')
                      .attr('class', 'nodes')
                      .selectAll('circle')
                      .data(graph.nodes)
                      .enter().append('circle')
                      .attr('stroke', 'black')
                      .attr('stroke-width', 2)
                      .attr('class', 'node')
                      .attr('r', function(d){
                        if(d.id === $scope.graphArtist) {
                          return radius;
                        }else{
                          return radius-(3*d.degree);
                        }
                      })
                      .attr('fill', function(d) {
                        if(d.id === $scope.graphArtist) {
                          return '#35586C';
                        }else{
                          return colors[d.degree-1];
                        }
                      })
                      .on('mouseover', function(){
                        d3.select(this)
            	           .attr("fill", "orange");
                      })
                      .on('mouseout', function(d){
                        if(d.id === $scope.graphArtist) {
                          d3.select(this)
              	           .attr("fill", '#35586C');
                        }else{
                          d3.select(this)
              	           .attr("fill", colors[d.degree-1]);
                        }
                      })
                      .call(d3.drag()
                      .on('start', dragstarted)
                      .on('drag', dragged)
                      .on('end', dragended));

                  node.append('title')
                      .text(function(d) { return d.id; });

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
                  }

                  function dragged(d) {
                    d.fx = d3.event.x;
                    d.fy = d3.event.y;
                  }

                  function dragended(d) {
                    if (!d3.event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                  }
      });
    }

    $scope.submitGraph('Bob Dylan');

    $scope.submitDegree = function(){
      var url = `/getConnection?fromArtist=${$scope.fromArtist}&toArtist=${$scope.toArtist}`;
      $http.get(url).then(function(response){
        $scope.path = response.data.path;
        $scope.degree = response.data.path.length - 1;

        var barPlaceholder = [];
        for(var i = 0; i < response.data.path.length-1; i++){
          barPlaceholder.push('A');
        }

        var first = true;
        var circleDistance = 96;
        var textDistance = 72;
        var barX = 55;
        var circleX = 40;
        var textX = 10;
        var y = 50;
        var radius = 15;
        var color = '#6ac5a9';

        var canvas = d3.select('#degreeVis svg');
        canvas.remove();
        canvas = d3.selectAll('#degreeVis')
                   .append('svg')
                   .attr('width', '100%')
                   .attr('height', '100px');

        var circles = canvas.selectAll('circle')
                      .data(response.data.path)
                      .enter()
                      .append('circle');

        var circleAttributes = circles
                      .attr('cx', function (d) { console.log(d); var xTemp = circleX; circleX = circleX + circleDistance; return xTemp})
                      .attr('cy', function (d) { return y; })
                      .attr('r', function (d) { return radius; })
                      .style('fill', function(d) { return color; });

        var rects = canvas.selectAll('rect')
                    .data(barPlaceholder)
                    .enter()
                    .append('rect');

        var rectAttributes = rects.attr('x', function(d) { var tempX = barX; barX = barX + circleDistance; return tempX })
                                  .attr('y', y-2)
                                  .attr('width', 66)
                                  .attr('height', 3)
                                  .attr('fill', 'black');

        var names = canvas.selectAll('text')
                    .data(response.data.path)
                    .enter()
                    .append('text');

        var nameAttributes = names.attr('x', function(d) { var xTemp = textX; textX = textX + 95; return xTemp })
                             .attr('y', function(d) { return y-30; })
                             .text( function (d) { return d; })
                             .attr('font-family', 'sans-serif')
                             .attr('font-size', '11px')
                             .attr('fill', 'black');


      }, function(error){

      }
    );
  };
}]);
