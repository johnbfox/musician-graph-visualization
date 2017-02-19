'use strict';

/*
 * Express Dependencies
 */
var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver('bolt://localhost:7687/', neo4j.auth.basic('neo4j', 'L@gn@f2016'));

var express = require('express');
var app = express();
var port = 3000;

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');
var hbs;

// For gzip compression
app.use(express.compress());

/*
 * Config for Production and Development
 */
if (process.env.NODE_ENV === 'production') {
    // Set the default layout and locate layouts and partials
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: 'dist/views/layouts/',
        partialsDir: 'dist/views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/dist/views');

    // Locate the assets
    app.use(express.static(__dirname + '/assets'));

} else {
    app.engine('handlebars', exphbs({
        // Default Layout and locate layouts and partials
        defaultLayout: 'main',
        layoutsDir: 'views/layouts/',
        partialsDir: 'views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/views');

    // Locate the assets
    app.use(express.static(__dirname + '/assets'));
}

// Set Handlebars
app.set('view engine', 'handlebars');

/*
 * Routes
 */
// Index Page

app.get('/', function(request, response) {
    response.render('index');
});

app.get('/getConnection', function(request, response){
  var fromArtist = request.query.fromArtist;
  var toArtist = request.query.toArtist;
  var query = `MATCH path = shortestPath((a:Artist { name:{fromArtist} })-[:LINK*]->(b:Artist { name:'${toArtist}' })) RETURN path, length(path) AS Steps`;
  var session = driver.session();
  var path = [];

  session.run(query, {fromArtist: fromArtist}).then(function(result){
     var segments = result.records[0]._fields[0].segments;

     for(let i = 0; i < segments.length; i++){
       path.push(segments[i].start.properties.name);
     }

     path.push(toArtist);
     response.send({
       'path':path
     });
  });
});

app.get('/getNames/:name', function(request, response){
  var name = request.params.name;

  var session = driver.session();
  var names = [];
  var query = `MATCH (n:Artist) WHERE n.name STARTS WITH {name} return n LIMIT 10`;

  session.run(query, {name:name}).then(function(result){
    var records = result.records;
    for(var record of records){
      var name = record._fields[0].properties.name;
      names.push(name);
    }
    response.send({
      names:names
    });
  });

});

app.get('/getGraph/:id', function(request, response){

  var artist = request.params.id;

  var session = driver.session();

  var query = `MATCH (a:Artist {name:{artist}})-[r*1..3]->(d) RETURN distinct a, r, d`;

  session.run(query, {artist:artist}).then(function(result){

    var records = result.records;

    var nodesTemp = {};
    var links = [];

    for(var i = 0; i < records.length; i++){
      var id = records[i]._fields[2].identity.low;
      var name = records[i]._fields[2].properties.name;
      var degree = records[i]._fields[1].length;

      var node = nodesTemp[id];

      if(typeof node === 'undefined'){
        nodesTemp[id] = {
          'id': name,
          'degree': degree
        };
      }else{
        if(degree < node.degree){
          nodesTemp[id].degree = degree;
        }
      }
    }

    var nodes = [];
    for(var key in nodesTemp){
      nodes.push(nodesTemp[key]);
    }

    for(var i = 0; i < records.length; i++){
      var degree = records[i]._fields[1].length;
      var edge = records[i]._fields[1][degree-1];

      var start = edge.start.low;
      var end = edge.end.low;

      links.push({
        'source': nodesTemp[start].id,
        'target': nodesTemp[end].id
      });
    }

    var responseJson = {
      'nodes': nodes,
      'links': links
    };

    response.send(responseJson);
  });
});

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);
