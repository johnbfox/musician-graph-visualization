'use strict';

var neo4j = require('neo4j-driver').v1;
var dbConfig = require('./config/config.json');
var driver = neo4j.driver(dbConfig.url, neo4j.auth.basic(dbConfig.user, dbConfig.password));

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
  var query = `MATCH path = shortestPath((a:Artist { name:{fromArtist} })-[:LINK*]->(b:Artist { name:{toArtist} })) RETURN path, length(path) AS Steps`;
  var session = driver.session();
  var path = [];

  session.run(query, {fromArtist: fromArtist, toArtist: toArtist}).then(function(result){
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
  var query = `MATCH (n:Artist) WHERE LOWER(n.name) CONTAINS LOWER({name}) return n LIMIT 10`;

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

  var artist = toNameCase(request.params.id);
  console.log(artist);
  var session = driver.session();

  var query = `MATCH (a:Artist {name:{artist}})-[r*1..2]->(d) RETURN distinct a, r, d`;

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
      'artist': artist,
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
console.log('Express started on port ' + ( process.env.PORT || port ) );

function toNameCase(name){
  if(name && name.length > 0){

    const tokens = name.split(' ');
    const result = [];

    if (tokens.length != 2){
      return name;
    }
    
    for(let token of tokens){
      console.log(token);
      let str = token[0].toUpperCase();

      for(let i = 1; i < token.length; i++){
        str += token[i].toLowerCase();
      }

      result.push(str);
    }

    let returnString = ''
    for(let i = 0; i < result.length; i++){
      returnString += result[i];
      if(i != result.length - 1){
        returnString += ' '
      }
    }

    return returnString;
  }
}
